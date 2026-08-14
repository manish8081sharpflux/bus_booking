const pool = require('../infrastructure/database/postgres.connection')

async function listAllBuses() {
  const { rows } = await pool.query(`
    SELECT b.id,b.operator_id,b.registration_number,b.name,b.bus_type,b.manufacturer,b.model,
      b.manufacture_year,b.seat_capacity,b.deck_type,b.amenities,b.status,b.created_at,b.updated_at,
      o.display_name AS operator_name,
      (SELECT COUNT(*)::int FROM bus_seats s WHERE s.bus_id=b.id AND s.is_active) configured_seats,
      (SELECT COUNT(*)::int FROM bus_documents d WHERE d.bus_id=b.id) document_count,
      bc.verification_status AS compliance_status,bc.insurance_expiry,bc.permit_expiry,bc.fitness_expiry,bc.puc_expiry
    FROM buses b
    JOIN operators o ON o.id=b.operator_id
    LEFT JOIN bus_compliance bc ON bc.bus_id=b.id
    ORDER BY b.created_at DESC
  `)
  return rows
}

async function listAllTrips() {
  const { rows } = await pool.query(`
    SELECT t.id,t.operator_id,t.bus_id,t.route_id,t.service_number,t.departure_at,t.arrival_at,t.base_fare,t.currency,t.status,
      t.created_at,t.updated_at,o.display_name AS operator_name,b.name AS bus_name,b.registration_number,
      r.source_city,r.destination_city,
      COUNT(i.bus_seat_id)::int AS total_seats,
      COUNT(i.bus_seat_id) FILTER (WHERE i.status='AVAILABLE')::int AS available_seats,
      COUNT(i.bus_seat_id) FILTER (WHERE i.status='BOOKED')::int AS booked_seats
    FROM trips t
    JOIN operators o ON o.id=t.operator_id
    JOIN buses b ON b.id=t.bus_id
    JOIN routes r ON r.id=t.route_id
    LEFT JOIN trip_seat_inventory i ON i.trip_id=t.id
    GROUP BY t.id,o.display_name,b.name,b.registration_number,r.source_city,r.destination_city
    ORDER BY t.departure_at DESC
  `)
  return rows
}

async function listAllBookings() {
  const { rows } = await pool.query(`
    SELECT bk.id,bk.booking_reference,bk.status,bk.total_amount,bk.currency,bk.created_at,bk.cancelled_at,
      t.service_number,t.departure_at,r.source_city,r.destination_city,o.display_name AS operator_name,
      bu.name AS bus_name,u.full_name AS customer_name,u.mobile AS customer_mobile,u.email AS customer_email,
      COALESCE(p.status::text,'NOT_PAID') AS payment_status,p.method AS payment_method,p.provider,
      COALESCE((SELECT COUNT(*)::int FROM booking_passengers bp WHERE bp.booking_id=bk.id),0) passenger_count
    FROM bookings bk
    JOIN trips t ON t.id=bk.trip_id
    JOIN routes r ON r.id=t.route_id
    JOIN operators o ON o.id=bk.operator_id
    JOIN buses bu ON bu.id=t.bus_id
    JOIN platform_users u ON u.id=bk.customer_id
    LEFT JOIN LATERAL (
      SELECT px.* FROM payments px WHERE px.booking_id=bk.id ORDER BY px.created_at DESC LIMIT 1
    ) p ON TRUE
    ORDER BY bk.created_at DESC
  `)
  return rows
}

async function listPaymentsAndRefunds() {
  const [paymentsResult, refundsResult] = await Promise.all([
    pool.query(`
      SELECT p.id,p.booking_id,p.provider,p.provider_order_id,p.provider_payment_id,p.amount,p.currency,p.status,p.method,
        p.failure_code,p.failure_message,p.created_at,p.updated_at,b.booking_reference,
        o.display_name AS operator_name,u.full_name AS customer_name,u.mobile AS customer_mobile
      FROM payments p
      JOIN bookings b ON b.id=p.booking_id
      JOIN operators o ON o.id=b.operator_id
      JOIN platform_users u ON u.id=b.customer_id
      ORDER BY p.created_at DESC
    `),
    pool.query(`
      SELECT r.id,r.payment_id,r.provider_refund_id,r.amount,r.reason,r.status,r.created_at,r.updated_at,
        p.booking_id,p.provider,b.booking_reference,o.display_name AS operator_name
      FROM refunds r
      JOIN payments p ON p.id=r.payment_id
      JOIN bookings b ON b.id=p.booking_id
      JOIN operators o ON o.id=b.operator_id
      ORDER BY r.created_at DESC
    `),
  ])
  return { payments: paymentsResult.rows, refunds: refundsResult.rows }
}

module.exports = { listAllBuses, listAllTrips, listAllBookings, listPaymentsAndRefunds }

async function listLiveTrips() {
  const { rows } = await pool.query(`
    SELECT t.id,t.service_number,t.departure_at,t.arrival_at,t.status,o.display_name operator_name,
      b.name bus_name,b.registration_number,r.source_city,r.destination_city,
      COUNT(i.bus_seat_id)::int total_seats,
      COUNT(i.bus_seat_id) FILTER(WHERE i.status='BOOKED')::int booked_seats,
      loc.latitude,loc.longitude,loc.speed_kph,loc.recorded_at last_location_at
    FROM trips t JOIN operators o ON o.id=t.operator_id JOIN buses b ON b.id=t.bus_id JOIN routes r ON r.id=t.route_id
    LEFT JOIN trip_seat_inventory i ON i.trip_id=t.id
    LEFT JOIN LATERAL (SELECT latitude,longitude,speed_kph,recorded_at FROM trip_location_history l WHERE l.trip_id=t.id ORDER BY recorded_at DESC LIMIT 1) loc ON TRUE
    WHERE t.status='SCHEDULED' AND t.departure_at<=NOW() AND t.arrival_at>=NOW()
    GROUP BY t.id,o.display_name,b.name,b.registration_number,r.source_city,r.destination_city,loc.latitude,loc.longitude,loc.speed_kph,loc.recorded_at
    ORDER BY t.departure_at`)
  return rows
}

async function listSettlements() {
  const { rows } = await pool.query(`
    SELECT o.id operator_id,o.display_name operator_name,
      COUNT(DISTINCT b.id)::int bookings,
      COALESCE(SUM(p.amount) FILTER(WHERE p.status='CAPTURED'),0)::numeric gross_collected,
      COALESCE(SUM(rf.amount) FILTER(WHERE rf.status IN('PENDING','REFUNDED')),0)::numeric refunds,
      (COALESCE(SUM(p.amount) FILTER(WHERE p.status='CAPTURED'),0)-COALESCE(SUM(rf.amount) FILTER(WHERE rf.status IN('PENDING','REFUNDED')),0))::numeric net_payable,
      MAX(p.created_at) last_payment_at
    FROM operators o LEFT JOIN bookings b ON b.operator_id=o.id
    LEFT JOIN payments p ON p.booking_id=b.id
    LEFT JOIN refunds rf ON rf.payment_id=p.id
    GROUP BY o.id,o.display_name ORDER BY net_payable DESC`)
  return rows
}

async function listSupportIssues() {
  const { rows } = await pool.query(`
    SELECT * FROM (
      SELECT 'CANCELLED_BOOKING' issue_type,b.id entity_id,b.booking_reference reference,
        u.full_name customer_name,u.mobile customer_mobile,o.display_name operator_name,
        'Booking cancelled' summary,b.cancelled_at occurred_at,'MEDIUM' priority
      FROM bookings b JOIN platform_users u ON u.id=b.customer_id JOIN operators o ON o.id=b.operator_id
      WHERE b.status='CANCELLED'
      UNION ALL
      SELECT 'FAILED_PAYMENT',p.id,b.booking_reference,u.full_name,u.mobile,o.display_name,
        COALESCE(p.failure_message,'Payment failed'),p.created_at,'HIGH'
      FROM payments p JOIN bookings b ON b.id=p.booking_id JOIN platform_users u ON u.id=b.customer_id JOIN operators o ON o.id=b.operator_id
      WHERE p.status='FAILED'
    ) issues ORDER BY occurred_at DESC LIMIT 250`)
  return rows
}

async function listAuditLogs() {
  const { rows } = await pool.query(`SELECT a.id,a.entity_type,a.entity_id,a.action,a.before_state,a.after_state,a.created_at,
    u.full_name actor_name,u.mobile actor_mobile FROM audit_logs a LEFT JOIN platform_users u ON u.id=a.actor_user_id
    ORDER BY a.created_at DESC LIMIT 500`)
  return rows
}

async function getReportsOverview() {
  const { rows: summaryRows } = await pool.query(`SELECT
    COUNT(*)::int total_bookings,
    COUNT(*) FILTER(WHERE status='CONFIRMED')::int confirmed_bookings,
    COUNT(*) FILTER(WHERE status='CANCELLED')::int cancelled_bookings,
    COALESCE(SUM(total_amount) FILTER(WHERE status='CONFIRMED'),0)::numeric confirmed_value
    FROM bookings`)
  const { rows: daily } = await pool.query(`SELECT created_at::date day,COUNT(*)::int bookings,
    COALESCE(SUM(total_amount) FILTER(WHERE status='CONFIRMED'),0)::numeric revenue
    FROM bookings WHERE created_at>=CURRENT_DATE-INTERVAL '13 days' GROUP BY created_at::date ORDER BY day`)
  const { rows: routes } = await pool.query(`SELECT r.source_city,r.destination_city,COUNT(bk.id)::int bookings,
    COALESCE(SUM(bk.total_amount) FILTER(WHERE bk.status='CONFIRMED'),0)::numeric revenue
    FROM bookings bk JOIN trips t ON t.id=bk.trip_id JOIN routes r ON r.id=t.route_id
    GROUP BY r.id,r.source_city,r.destination_city ORDER BY bookings DESC LIMIT 10`)
  const { rows: operators } = await pool.query(`SELECT o.display_name operator_name,COUNT(bk.id)::int bookings,
    COALESCE(SUM(bk.total_amount) FILTER(WHERE bk.status='CONFIRMED'),0)::numeric revenue
    FROM operators o LEFT JOIN bookings bk ON bk.operator_id=o.id GROUP BY o.id,o.display_name ORDER BY revenue DESC LIMIT 10`)
  return { summary: summaryRows[0], daily, routes, operators }
}

module.exports.listLiveTrips = listLiveTrips
module.exports.listSettlements = listSettlements
module.exports.listSupportIssues = listSupportIssues
module.exports.listAuditLogs = listAuditLogs
module.exports.getReportsOverview = getReportsOverview

async function generateSettlement({operatorId,periodStart,periodEnd,commissionPercent=10}) {
  const { rows }=await pool.query(`WITH x AS (SELECT COALESCE(SUM(p.amount) FILTER(WHERE p.status='CAPTURED'),0) gross,COALESCE(SUM(r.amount) FILTER(WHERE r.status IN('PENDING','REFUNDED')),0) refunds FROM bookings b LEFT JOIN payments p ON p.booking_id=b.id LEFT JOIN refunds r ON r.payment_id=p.id WHERE b.operator_id=$1::uuid AND b.created_at::date BETWEEN $2::date AND $3::date) INSERT INTO operator_settlements(operator_id,period_start,period_end,gross_amount,refund_amount,commission_amount,net_payable,status) SELECT $1::uuid,$2::date,$3::date,gross,refunds,ROUND((gross-refunds)*$4/100,2),ROUND((gross-refunds)-((gross-refunds)*$4/100),2),'DRAFT' FROM x ON CONFLICT(operator_id,period_start,period_end) DO UPDATE SET gross_amount=EXCLUDED.gross_amount,refund_amount=EXCLUDED.refund_amount,commission_amount=EXCLUDED.commission_amount,net_payable=EXCLUDED.net_payable,updated_at=NOW() RETURNING *`,[operatorId,periodStart,periodEnd,Number(commissionPercent)]);return rows[0]
}
async function markSettlementPaid({id,payoutReference}){const {rows}=await pool.query(`UPDATE operator_settlements SET status='PAID',payout_reference=$2,paid_at=NOW(),updated_at=NOW() WHERE id=$1::uuid RETURNING *`,[id,payoutReference||`DEMO-${Date.now()}`]);if(!rows[0])throw Object.assign(new Error('Settlement not found.'),{status:404});return rows[0]}
module.exports.generateSettlement=generateSettlement
module.exports.markSettlementPaid=markSettlementPaid

async function listPromotions() {
  const { rows } = await pool.query(`SELECT p.id,p.code,p.title,p.description,p.status,p.discount_type,p.discount_value,p.max_discount_amount,p.starts_at,p.ends_at,p.usage_limit,p.per_user_limit,p.budget_amount,p.budget_consumed,p.eligibility,p.operator_id,p.route_id,p.created_at,p.updated_at,
    COALESCE((SELECT COUNT(*)::int FROM promotion_redemptions pr WHERE pr.promotion_id=p.id),0) redemption_count,
    COALESCE((SELECT SUM(pr.discount_amount) FROM promotion_redemptions pr WHERE pr.promotion_id=p.id),0)::numeric redeemed_amount,
    o.display_name operator_name,r.source_city,r.destination_city
    FROM pricing_promotions p LEFT JOIN operators o ON o.id=p.operator_id LEFT JOIN routes r ON r.id=p.route_id ORDER BY p.created_at DESC`)
  return rows
}
async function createPromotion(input) {
  const code=String(input.code||'').trim().toUpperCase(); const type=String(input.discountType||'PERCENTAGE').toUpperCase(); const value=Number(input.discountValue)
  if(!/^[A-Z0-9_-]{3,24}$/.test(code)||!['FIXED','PERCENTAGE'].includes(type)||!Number.isFinite(value)||value<=0) throw Object.assign(new Error('Valid code, discount type and positive value are required.'),{status:422})
  if(type==='PERCENTAGE'&&value>100) throw Object.assign(new Error('Percentage discount cannot exceed 100%.'),{status:422})
  const starts=input.startsAt?new Date(input.startsAt):new Date(); const ends=input.endsAt?new Date(input.endsAt):new Date(Date.now()+30*86400000)
  if(Number.isNaN(starts.getTime())||Number.isNaN(ends.getTime())||ends<=starts) throw Object.assign(new Error('Promotion end date must be after start date.'),{status:422})
  const eligibility={...(input.eligibility||{})}; if(input.minBookingAmount!==undefined&&input.minBookingAmount!=='') eligibility.minBookingAmount=Number(input.minBookingAmount)
  const {rows}=await pool.query(`INSERT INTO pricing_promotions(code,title,description,status,discount_type,discount_value,max_discount_amount,starts_at,ends_at,usage_limit,per_user_limit,budget_amount,eligibility,operator_id,route_id) VALUES($1,$2,$3,$4::pricing_promotion_status,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::uuid,$15::uuid) RETURNING *`,[code,String(input.title||code).trim(),String(input.description||'Save on eligible BusGo bookings.').trim(),input.status||'DRAFT',type,value,input.maxDiscountAmount||null,starts.toISOString(),ends.toISOString(),input.usageLimit||null,input.perUserLimit||null,input.budgetAmount||null,JSON.stringify(eligibility),input.operatorId||null,input.routeId||null])
  return rows[0]
}
async function updatePromotionStatus({id,status}) {
  const normalized=String(status||'').toUpperCase(); if(!['DRAFT','ACTIVE','PAUSED','EXPIRED'].includes(normalized)) throw Object.assign(new Error('Invalid promotion status.'),{status:422})
  const {rows}=await pool.query(`UPDATE pricing_promotions SET status=$2::pricing_promotion_status,updated_at=NOW() WHERE id=$1::uuid RETURNING *`,[id,normalized]); if(!rows[0]) throw Object.assign(new Error('Promotion not found.'),{status:404}); return rows[0]
}
module.exports.listPromotions=listPromotions
module.exports.createPromotion=createPromotion
module.exports.updatePromotionStatus=updatePromotionStatus

async function cancelTripAdmin({tripId,reason,actorUserId}) {
  const catalog=require('./catalog.service'); return catalog.cancelTrip({tripId,operatorId:null,reason,actorUserId})
}
async function listSupportTickets() {
  const {rows}=await pool.query(`SELECT st.id,st.ticket_number,st.category,st.subject,st.description,st.priority,st.status,st.resolution,st.created_at,st.updated_at,st.resolved_at,b.booking_reference,u.full_name customer_name,u.mobile customer_mobile,o.display_name operator_name FROM support_tickets st LEFT JOIN bookings b ON b.id=st.booking_id LEFT JOIN platform_users u ON u.id=st.customer_id LEFT JOIN operators o ON o.id=st.operator_id ORDER BY CASE st.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,st.created_at DESC LIMIT 500`);return rows
}
async function updateSupportTicket({id,status,resolution,actorUserId}) {
  const normalized=String(status||'').toUpperCase();if(!['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].includes(normalized))throw Object.assign(new Error('Invalid support status.'),{status:422});const {rows}=await pool.query(`UPDATE support_tickets SET status=$2,resolution=COALESCE($3,resolution),assigned_to=COALESCE(assigned_to,$4::uuid),resolved_at=CASE WHEN $2 IN('RESOLVED','CLOSED') THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1::uuid RETURNING *`,[id,normalized,resolution||null,actorUserId||null]);if(!rows[0])throw Object.assign(new Error('Support ticket not found.'),{status:404});return rows[0]
}
module.exports.cancelTripAdmin=cancelTripAdmin
module.exports.listSupportTickets=listSupportTickets
module.exports.updateSupportTicket=updateSupportTicket

function reconciliationFail(message,status=400){return Object.assign(new Error(message),{status})}

async function listPaymentReconciliation({limit=200}={}) {
  const safeLimit=Math.max(1,Math.min(500,Number(limit)||200))
  const [paymentBooking,confirmedWithoutCaptured,pendingPayments,pendingRefunds,webhooks]=await Promise.all([
    pool.query(`SELECT 'CAPTURED_PAYMENT_BOOKING_MISMATCH' kind,p.id entity_id,p.booking_id,b.booking_reference,
      p.status payment_status,b.status booking_status,p.amount,p.currency,p.provider,p.provider_order_id,p.provider_payment_id,
      p.updated_at occurred_at,'CRITICAL' severity,
      'Payment is captured but booking is not confirmed.' summary
      FROM payments p JOIN bookings b ON b.id=p.booking_id
      WHERE p.status='CAPTURED' AND b.status<>'CONFIRMED'
      ORDER BY p.updated_at DESC LIMIT $1`,[safeLimit]),
    pool.query(`SELECT 'CONFIRMED_WITHOUT_CAPTURED_PAYMENT' kind,b.id entity_id,b.id booking_id,b.booking_reference,
      COALESCE(p.status::text,'NOT_PAID') payment_status,b.status booking_status,b.total_amount amount,b.currency,
      p.provider,p.provider_order_id,p.provider_payment_id,b.updated_at occurred_at,'CRITICAL' severity,
      'Booking is confirmed but no captured/refunded payment is recorded.' summary
      FROM bookings b LEFT JOIN LATERAL (
        SELECT px.* FROM payments px WHERE px.booking_id=b.id ORDER BY px.created_at DESC LIMIT 1
      ) p ON TRUE
      WHERE b.status='CONFIRMED' AND COALESCE(p.status::text,'NOT_PAID') NOT IN('CAPTURED','REFUNDED','PARTIALLY_REFUNDED')
      ORDER BY b.updated_at DESC LIMIT $1`,[safeLimit]),
    pool.query(`SELECT 'STALE_PENDING_PAYMENT' kind,p.id entity_id,p.booking_id,b.booking_reference,
      p.status payment_status,b.status booking_status,p.amount,p.currency,p.provider,p.provider_order_id,p.provider_payment_id,
      p.created_at occurred_at,'HIGH' severity,
      'Payment has remained pending for more than 30 minutes.' summary
      FROM payments p JOIN bookings b ON b.id=p.booking_id
      WHERE p.status='PENDING' AND p.created_at<NOW()-INTERVAL '30 minutes'
      ORDER BY p.created_at DESC LIMIT $1`,[safeLimit]),
    pool.query(`SELECT 'STALE_PENDING_REFUND' kind,r.id entity_id,p.booking_id,b.booking_reference,
      p.status payment_status,b.status booking_status,r.amount,p.currency,p.provider,p.provider_order_id,p.provider_payment_id,
      COALESCE(r.requested_at,r.created_at) occurred_at,'HIGH' severity,
      'Refund has remained pending for more than 24 hours.' summary
      FROM refunds r JOIN payments p ON p.id=r.payment_id JOIN bookings b ON b.id=p.booking_id
      WHERE r.status='PENDING' AND COALESCE(r.requested_at,r.created_at)<NOW()-INTERVAL '24 hours'
      ORDER BY COALESCE(r.requested_at,r.created_at) DESC LIMIT $1`,[safeLimit]),
    pool.query(`SELECT 'WEBHOOK_RECONCILIATION_REQUIRED' kind,e.id entity_id,NULL::uuid booking_id,
      e.provider_event_id booking_reference,NULL::text payment_status,NULL::text booking_status,NULL::numeric amount,
      NULL::text currency,e.provider,NULL::text provider_order_id,NULL::text provider_payment_id,
      e.created_at occurred_at,'HIGH' severity,e.processing_error summary
      FROM payment_webhook_events e
      WHERE e.processing_error IS NOT NULL
      ORDER BY e.created_at DESC LIMIT $1`,[safeLimit]),
  ])
  const items=[
    ...paymentBooking.rows,
    ...confirmedWithoutCaptured.rows,
    ...pendingPayments.rows,
    ...pendingRefunds.rows,
    ...webhooks.rows,
  ].sort((a,b)=>new Date(b.occurred_at)-new Date(a.occurred_at)).slice(0,safeLimit)
  const summary=items.reduce((acc,x)=>{acc.total++;acc[x.severity]=(acc[x.severity]||0)+1;acc.byKind[x.kind]=(acc.byKind[x.kind]||0)+1;return acc},{total:0,CRITICAL:0,HIGH:0,MEDIUM:0,byKind:{}})
  return {summary,items}
}

async function actorUserIdFromAuth(authUserId,client=pool) {
  if(!authUserId)return null
  const {rows}=await client.query(`SELECT id FROM platform_users WHERE auth_user_id=$1 OR auth_user_id=$2 LIMIT 1`,[String(authUserId),`identity:${authUserId}`])
  return rows[0]?.id||null
}

async function resolvePaymentReconciliation({kind,id,action,note='',actorAuthUserId=null}) {
  const normalizedKind=String(kind||'').trim().toUpperCase()
  const normalizedAction=String(action||'').trim().toUpperCase()
  const cleanNote=String(note||'').trim()
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const actorUserId=await actorUserIdFromAuth(actorAuthUserId,client)

    if(normalizedKind==='CAPTURED_PAYMENT_BOOKING_MISMATCH' && normalizedAction==='CONFIRM_BOOKING'){
      const {rows}=await client.query(`SELECT p.*,b.status booking_status,b.booking_reference,b.customer_id
        FROM payments p JOIN bookings b ON b.id=p.booking_id
        WHERE p.id=$1::uuid AND p.status='CAPTURED' FOR UPDATE OF p,b`,[id])
      const row=rows[0]
      if(!row)throw reconciliationFail('Captured payment mismatch not found.',404)
      if(row.booking_status==='CONFIRMED'){await client.query('COMMIT');return {status:'ALREADY_RESOLVED',bookingId:row.booking_id}}

      const counts=(await client.query(`SELECT
        (SELECT COUNT(*)::int FROM booking_passengers WHERE booking_id=$1::uuid) passenger_count,
        (SELECT COUNT(*)::int FROM trip_seat_segment_allocations WHERE booking_id=$1::uuid AND status IN('HELD','CONFIRMED')) allocation_count`,[row.booking_id])).rows[0]
      if(!Number(counts.passenger_count)||Number(counts.passenger_count)!==Number(counts.allocation_count))
        throw reconciliationFail('Cannot confirm automatically because seat allocations no longer match passengers. Refund/manual handling is required.',409)

      await client.query(`UPDATE bookings SET status='CONFIRMED',updated_at=NOW() WHERE id=$1::uuid`,[row.booking_id])
      await client.query(`UPDATE trip_seat_segment_allocations SET status='CONFIRMED',expires_at=NULL WHERE booking_id=$1::uuid`,[row.booking_id])
      await client.query(`INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload)
        VALUES($1::uuid,$2::uuid,'IN_APP','BOOKING_CONFIRMED',$3::jsonb)`,[row.customer_id,row.booking_id,JSON.stringify({bookingReference:row.booking_reference,reconciled:true})])
      await client.query(`INSERT INTO audit_logs(actor_user_id,entity_type,entity_id,action,before_state,after_state)
        VALUES($1::uuid,'PAYMENT_RECONCILIATION',$2,'CONFIRM_BOOKING',$3::jsonb,$4::jsonb)`,[
          actorUserId,String(id),JSON.stringify({paymentStatus:row.status,bookingStatus:row.booking_status}),
          JSON.stringify({bookingStatus:'CONFIRMED',note:cleanNote||null})
        ])
      await client.query('COMMIT')
      return {status:'RESOLVED',action:'CONFIRM_BOOKING',bookingId:row.booking_id,paymentId:row.id}
    }

    if(normalizedKind==='STALE_PENDING_PAYMENT' && normalizedAction==='MARK_FAILED'){
      const {rows}=await client.query(`UPDATE payments p SET status='FAILED',
        failure_code=COALESCE(failure_code,'ADMIN_RECONCILIATION'),
        failure_message=COALESCE(NULLIF($2,''),failure_message,'Marked failed by payment reconciliation.'),
        updated_at=NOW()
        FROM bookings b
        WHERE p.id=$1::uuid AND b.id=p.booking_id AND p.status='PENDING' AND b.status<>'CONFIRMED'
        RETURNING p.*`,[id,cleanNote])
      if(!rows[0])throw reconciliationFail('Only a pending payment on a non-confirmed booking can be marked failed.',409)
      await client.query(`INSERT INTO audit_logs(actor_user_id,entity_type,entity_id,action,after_state)
        VALUES($1::uuid,'PAYMENT_RECONCILIATION',$2,'MARK_PAYMENT_FAILED',$3::jsonb)`,
        [actorUserId,String(id),JSON.stringify({status:'FAILED',note:cleanNote||null})])
      await client.query('COMMIT')
      return {status:'RESOLVED',action:'MARK_FAILED',payment:rows[0]}
    }

    if(normalizedKind==='WEBHOOK_RECONCILIATION_REQUIRED' && normalizedAction==='ACKNOWLEDGE'){
      const {rows}=await client.query(`UPDATE payment_webhook_events
        SET processing_error=NULL,processed_at=COALESCE(processed_at,NOW())
        WHERE id=$1::uuid AND processing_error IS NOT NULL RETURNING *`,[id])
      if(!rows[0])throw reconciliationFail('Webhook reconciliation item not found or already acknowledged.',404)
      await client.query(`INSERT INTO audit_logs(actor_user_id,entity_type,entity_id,action,after_state)
        VALUES($1::uuid,'PAYMENT_RECONCILIATION',$2,'ACKNOWLEDGE_WEBHOOK',$3::jsonb)`,
        [actorUserId,String(id),JSON.stringify({note:cleanNote||null,providerEventId:rows[0].provider_event_id})])
      await client.query('COMMIT')
      return {status:'ACKNOWLEDGED',eventId:rows[0].id}
    }

    throw reconciliationFail('Unsupported reconciliation action. Allowed: CONFIRM_BOOKING, MARK_FAILED, ACKNOWLEDGE.',422)
  }catch(e){
    await client.query('ROLLBACK')
    throw e
  }finally{client.release()}
}

module.exports.listPaymentReconciliation=listPaymentReconciliation
module.exports.resolvePaymentReconciliation=resolvePaymentReconciliation
