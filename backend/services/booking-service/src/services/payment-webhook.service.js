const crypto = require('crypto');

const pool = require('../infrastructure/database/postgres.connection');
const paymentProvider = require('../integrations/payment.provider');

const fail = (message, status = 400) => Object.assign(new Error(message), { status });

const WEBHOOK_BUS_BOOKABILITY_SQL = `
  b.status = 'ACTIVE'
  AND b.operational_status = 'ACTIVE'
  AND b.approval_status = 'APPROVED'
  AND EXISTS (
    SELECT 1
    FROM bus_compliance bc
    WHERE bc.bus_id = b.id
      AND bc.verification_status = 'VERIFIED'
      AND bc.insurance_expiry >= CURRENT_DATE
      AND bc.permit_expiry >= CURRENT_DATE
      AND bc.fitness_expiry >= CURRENT_DATE
      AND (
        bc.puc_expiry IS NULL
        OR bc.puc_expiry >= CURRENT_DATE
      )
  )
  AND EXISTS (
    SELECT 1
    FROM bus_documents bd
    WHERE bd.bus_id = b.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM bus_documents bd
    WHERE bd.bus_id = b.id
      AND bd.verification_status <> 'VERIFIED'
  )
`;

async function assertWebhookBookingStillBookable(
  client,
  bookingId,
) {
  const result =
    await client.query(
      `SELECT
         t.id AS trip_id,
         b.id AS bus_id
       FROM bookings bk
       JOIN trips t
         ON t.id = bk.trip_id
       JOIN buses b
         ON b.id = t.bus_id
       WHERE bk.id = $1::uuid
         AND bk.expires_at > NOW()
         AND t.status = 'SCHEDULED'
         AND t.departure_at > NOW()
         AND ${WEBHOOK_BUS_BOOKABILITY_SQL}
       FOR SHARE OF t,b`,
      [bookingId],
    );

  return Boolean(
    result.rows[0],
  );
}
function rupeesFromPaise(value) {
  return Math.round((Number(value || 0) / 100) * 100) / 100;
}

function eventKey(rawBody, explicitId) {
  if (explicitId) return String(explicitId);
  return crypto.createHash('sha256').update(rawBody).digest('hex');
}

async function markEvent(client, eventId, { error = null } = {}) {
  await client.query(
    `UPDATE payment_webhook_events
       SET processed_at=NOW(), processing_error=$2
     WHERE id=$1::uuid`,
    [eventId, error]
  );
}

async function enqueueBookingConfirmed(client, booking) {
  const payload = JSON.stringify({ bookingReference: booking.booking_reference });
  await client.query(
    `INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload)
     VALUES
       ($1::uuid,$2::uuid,'IN_APP','BOOKING_CONFIRMED',$3::jsonb),
       ($1::uuid,$2::uuid,'SMS','BOOKING_CONFIRMED',$3::jsonb)`,
    [booking.customer_id, booking.id, payload]
  );
}

async function processPaymentCaptured(client, webhookEventId, entity, fullEvent) {
  const providerPaymentId = entity?.id || null;
  const providerOrderId = entity?.order_id || null;

  const result = await client.query(
    `SELECT
       p.*,
       b.id booking_id,
       b.status booking_status,
       b.customer_id,
       b.booking_reference,
       b.currency booking_currency,
       b.total_amount booking_total_amount
     FROM payments p
     JOIN bookings b ON b.id=p.booking_id
     WHERE p.provider='RAZORPAY'
       AND (
         ($1::text IS NOT NULL AND p.provider_order_id=$1)
         OR ($2::text IS NOT NULL AND p.provider_payment_id=$2)
       )
     ORDER BY p.created_at DESC
     LIMIT 1
     FOR UPDATE OF p,b`,
    [providerOrderId, providerPaymentId]
  );

  const row = result.rows[0];
  if (!row) {
    const message = `Captured Razorpay payment ${providerPaymentId || 'unknown'} could not be matched to a local payment.`;
    await markEvent(client, webhookEventId, { error: message });
    return { status: 'RECONCILIATION_REQUIRED', reason: message };
  }

  const providerAmount = rupeesFromPaise(entity?.amount);
  if (providerAmount && Math.abs(providerAmount - Number(row.amount)) > 0.01) {
    const message = `Captured amount mismatch. Gateway=${providerAmount} ${entity?.currency || ''}, local=${row.amount} ${row.currency}.`;
    await markEvent(client, webhookEventId, { error: message });
    return { status: 'RECONCILIATION_REQUIRED', paymentId: row.id, reason: message };
  }

  if (entity?.currency && String(entity.currency).toUpperCase() !== String(row.currency).toUpperCase()) {
    const message = `Captured currency mismatch. Gateway=${entity.currency}, local=${row.currency}.`;
    await markEvent(client, webhookEventId, { error: message });
    return { status: 'RECONCILIATION_REQUIRED', paymentId: row.id, reason: message };
  }

  if (!['REFUNDED', 'PARTIALLY_REFUNDED'].includes(row.status)) {
    await client.query(
      `UPDATE payments
       SET provider_payment_id=COALESCE(provider_payment_id,$2),
           status='CAPTURED',
           method=COALESCE($3,method),
           provider_payload=provider_payload || $4::jsonb,
           updated_at=NOW()
       WHERE id=$1::uuid`,
      [
        row.id,
        providerPaymentId,
        entity?.method || null,
        JSON.stringify({ webhook: fullEvent, signatureVerified: true }),
      ]
    );
  }

  if (row.booking_status === 'CONFIRMED') {
    await markEvent(client, webhookEventId);
    return { status: 'ALREADY_CONFIRMED', bookingId: row.booking_id, paymentId: row.id };
  }

  if (row.booking_status !== 'PENDING_PAYMENT') {
    const message = `Payment captured for booking in ${row.booking_status} state. Automatic confirmation was not performed.`;
    await markEvent(client, webhookEventId, { error: message });
    return { status: 'RECONCILIATION_REQUIRED', bookingId: row.booking_id, paymentId: row.id, reason: message };
  }

  const stillBookable =
    await assertWebhookBookingStillBookable(
      client,
      row.booking_id,
    );

  if (!stillBookable) {
    const message =
      'Payment was captured after the trip or bus became ineligible. Automatic confirmation was not performed; manual reconciliation/refund is required.';

    await markEvent(
      client,
      webhookEventId,
      {
        error:
          message,
      },
    );

    return {
      status:
        'RECONCILIATION_REQUIRED',
      bookingId:
        row.booking_id,
      paymentId:
        row.id,
      reason:
        message,
    };
  }
  const allocationCheck = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM booking_passengers WHERE booking_id=$1::uuid) passenger_count,
       (SELECT COUNT(*)::int FROM trip_seat_segment_allocations
          WHERE booking_id=$1::uuid AND status IN ('HELD','CONFIRMED')) allocation_count`,
    [row.booking_id]
  );

  const { passenger_count: passengerCount, allocation_count: allocationCount } = allocationCheck.rows[0];

  if (!passengerCount || Number(allocationCount) !== Number(passengerCount)) {
    const message = 'Payment was captured after one or more seat holds were released. Manual reconciliation/refund is required.';
    await markEvent(client, webhookEventId, { error: message });
    return { status: 'RECONCILIATION_REQUIRED', bookingId: row.booking_id, paymentId: row.id, reason: message };
  }

  const booking = (
    await client.query(
      `UPDATE bookings
       SET status='CONFIRMED',updated_at=NOW()
       WHERE id=$1::uuid AND status='PENDING_PAYMENT'
       RETURNING id,customer_id,booking_reference,status`,
      [row.booking_id]
    )
  ).rows[0];

  if (booking) {
    await client.query(
      `UPDATE trip_seat_segment_allocations
       SET status='CONFIRMED',expires_at=NULL
       WHERE booking_id=$1::uuid`,
      [row.booking_id]
    );
    await enqueueBookingConfirmed(client, booking);
  }

  await markEvent(client, webhookEventId);
  return { status: booking ? 'CONFIRMED' : 'ALREADY_PROCESSED', bookingId: row.booking_id, paymentId: row.id };
}

async function processPaymentFailed(client, webhookEventId, entity, fullEvent) {
  const providerPaymentId = entity?.id || null;
  const providerOrderId = entity?.order_id || null;

  const result = await client.query(
    `UPDATE payments
     SET provider_payment_id=COALESCE(provider_payment_id,$2),
         status=CASE
           WHEN status IN ('CAPTURED','REFUNDED','PARTIALLY_REFUNDED') THEN status
           ELSE 'FAILED'
         END,
         failure_code=COALESCE($3,failure_code),
         failure_message=COALESCE($4,failure_message),
         provider_payload=provider_payload || $5::jsonb,
         updated_at=NOW()
     WHERE provider='RAZORPAY'
       AND (
         ($1::text IS NOT NULL AND provider_order_id=$1)
         OR ($2::text IS NOT NULL AND provider_payment_id=$2)
       )
     RETURNING id,booking_id,status`,
    [
      providerOrderId,
      providerPaymentId,
      entity?.error_code || entity?.error_source || null,
      entity?.error_description || entity?.error_reason || 'Razorpay reported payment failure.',
      JSON.stringify({ webhook: fullEvent, signatureVerified: true }),
    ]
  );

  if (!result.rows[0]) {
    const message = `Failed Razorpay payment ${providerPaymentId || 'unknown'} could not be matched to a local payment.`;
    await markEvent(client, webhookEventId, { error: message });
    return { status: 'RECONCILIATION_REQUIRED', reason: message };
  }

  await markEvent(client, webhookEventId);
  return { status: result.rows[0].status, paymentId: result.rows[0].id, bookingId: result.rows[0].booking_id };
}

async function processRefundProcessed(client, webhookEventId, entity, fullEvent) {
  const providerRefundId = entity?.id || null;
  const providerPaymentId = entity?.payment_id || null;
  const amount = rupeesFromPaise(entity?.amount);

  const payment = (
    await client.query(
      `SELECT p.*,b.customer_id,b.booking_reference
       FROM payments p
       JOIN bookings b ON b.id=p.booking_id
       WHERE p.provider='RAZORPAY' AND p.provider_payment_id=$1
       LIMIT 1
       FOR UPDATE OF p`,
      [providerPaymentId]
    )
  ).rows[0];

  if (!payment) {
    const message = `Processed refund ${providerRefundId || 'unknown'} could not be matched to a local payment.`;
    await markEvent(client, webhookEventId, { error: message });
    return { status: 'RECONCILIATION_REQUIRED', reason: message };
  }

  const existingRefund = (
    await client.query(
      `SELECT
         id,
         status
       FROM refunds
       WHERE provider_refund_id=$1
       FOR UPDATE`,
      [
        providerRefundId,
      ],
    )
  ).rows[0];

  const shouldNotifyRefundCompleted =
    !existingRefund ||
    existingRefund.status !== 'REFUNDED';
  const refund = (
    await client.query(
      `INSERT INTO refunds(
         payment_id,provider_refund_id,amount,reason,status,provider_payload,requested_at,completed_at
       )
       VALUES($1::uuid,$2,$3,'Razorpay refund webhook','REFUNDED',$4::jsonb,NOW(),NOW())
       ON CONFLICT(provider_refund_id) DO UPDATE SET
         status='REFUNDED',
         amount=EXCLUDED.amount,
         provider_payload=refunds.provider_payload || EXCLUDED.provider_payload,
         completed_at=COALESCE(refunds.completed_at,NOW()),
         updated_at=NOW()
       RETURNING *`,
      [payment.id, providerRefundId, amount, JSON.stringify({ webhook: fullEvent, signatureVerified: true })]
    )
  ).rows[0];

  const totals = (
    await client.query(
      `SELECT COALESCE(SUM(amount) FILTER(WHERE status='REFUNDED'),0)::numeric refunded
       FROM refunds WHERE payment_id=$1::uuid`,
      [payment.id]
    )
  ).rows[0];

  const paymentStatus = Number(totals.refunded) + 0.001 >= Number(payment.amount)
    ? 'REFUNDED'
    : 'PARTIALLY_REFUNDED';

  await client.query(
    `UPDATE payments SET status=$2,updated_at=NOW() WHERE id=$1::uuid`,
    [payment.id, paymentStatus]
  );

  if (payment.customer_id && shouldNotifyRefundCompleted) {
    const payload = JSON.stringify({
      bookingReference: payment.booking_reference,
      amount,
      refundId: providerRefundId,
    });
    await client.query(
      `INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload)
       VALUES
         ($1::uuid,$2::uuid,'IN_APP','REFUND_COMPLETED',$3::jsonb),
         ($1::uuid,$2::uuid,'SMS','REFUND_COMPLETED',$3::jsonb)`,
      [payment.customer_id, payment.booking_id, payload]
    );
  }

  await markEvent(client, webhookEventId);
  return { status: 'REFUNDED', refundId: refund.id, paymentId: payment.id, paymentStatus };
}

async function processRefundFailed(client, webhookEventId, entity, fullEvent) {
  const providerRefundId = entity?.id || null;
  const failureReason =
    entity?.error_description ||
    entity?.error_reason ||
    entity?.status ||
    'Razorpay reported refund failure.';

  const result = await client.query(
    `UPDATE refunds
     SET status=CASE
           WHEN status='REFUNDED' THEN status
           ELSE 'FAILED'
         END,
         failure_reason=CASE
           WHEN status='REFUNDED' THEN failure_reason
           ELSE $2
         END,
         provider_payload=provider_payload || $3::jsonb,
         updated_at=NOW()
     WHERE provider_refund_id=$1
     RETURNING id,payment_id,status`,
    [providerRefundId, failureReason, JSON.stringify({ webhook: fullEvent, signatureVerified: true })]
  );

  if (!result.rows[0]) {
    const message = `Failed refund ${providerRefundId || 'unknown'} could not be matched to a local refund.`;
    await markEvent(client, webhookEventId, { error: message });
    return { status: 'RECONCILIATION_REQUIRED', reason: message };
  }

  await markEvent(client, webhookEventId);
  return {
    status:
      result.rows[0].status === 'REFUNDED'
        ? 'ALREADY_REFUNDED'
        : 'FAILED',
    refundId:
      result.rows[0].id,
    paymentId:
      result.rows[0].payment_id,
  };
}

async function processRazorpayWebhook({ rawBody, signature, providerEventId = null }) {
  if (!Buffer.isBuffer(rawBody)) throw fail('Webhook body must be raw bytes.', 400);
  if (!signature || !paymentProvider.verifyWebhook(rawBody, signature)) {
    throw fail('Invalid Razorpay webhook signature.', 401);
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw fail('Webhook payload is not valid JSON.', 400);
  }

  const providerEventKey = eventKey(rawBody, providerEventId);
  const eventType = String(event?.event || 'unknown');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO payment_webhook_events(provider,provider_event_id,event_type,payload)
       VALUES('RAZORPAY',$1,$2,$3::jsonb)
       ON CONFLICT(provider,provider_event_id) DO NOTHING
       RETURNING id`,
      [providerEventKey, eventType, JSON.stringify(event)]
    );

    if (!inserted.rows[0]) {
      await client.query('COMMIT');
      return { duplicate: true, eventType };
    }

    const webhookEventId = inserted.rows[0].id;
    let result;

    if (eventType === 'payment.captured') {
      result = await processPaymentCaptured(client, webhookEventId, event?.payload?.payment?.entity, event);
    } else if (eventType === 'payment.failed') {
      result = await processPaymentFailed(client, webhookEventId, event?.payload?.payment?.entity, event);
    } else if (eventType === 'refund.processed') {
      result = await processRefundProcessed(client, webhookEventId, event?.payload?.refund?.entity, event);
    } else if (eventType === 'refund.failed') {
      result = await processRefundFailed(client, webhookEventId, event?.payload?.refund?.entity, event);
    } else {
      await markEvent(client, webhookEventId);
      result = { status: 'IGNORED', eventType };
    }

    await client.query('COMMIT');
    return { duplicate: false, eventType, ...result };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { processRazorpayWebhook };
