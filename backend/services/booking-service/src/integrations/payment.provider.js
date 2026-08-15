const crypto = require('crypto');

const provider = (process.env.PAYMENT_PROVIDER || 'DEMO').toUpperCase();
const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

async function razorpay(path, options = {}) {
  if (!keyId || !keySecret) throw new Error('Razorpay credentials are not configured.');
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: { Authorization:`Basic ${auth}`, 'Content-Type':'application/json', ...(options.headers||{}) },
  });
  const body = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(body?.error?.description || `Payment provider request failed (${response.status}).`);
  return body;
}

async function createOrder({ amount, currency='INR', receipt, notes={} }) {
  if (provider === 'DEMO') return { provider:'DEMO', id:`order_demo_${crypto.randomUUID()}`, amount:Math.round(Number(amount)*100), currency, receipt, status:'created', notes };
  if (provider !== 'RAZORPAY') throw new Error(`Unsupported payment provider: ${provider}`);
  return { provider:'RAZORPAY', ...(await razorpay('/orders',{ method:'POST', body:JSON.stringify({ amount:Math.round(Number(amount)*100), currency, receipt, notes }) })) };
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (provider === 'DEMO') return true;
  const expected = crypto.createHmac('sha256',keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return !!signature && crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(String(signature)));
}

function verifyWebhook(rawBody, signature) {
  if (!webhookSecret) return provider === 'DEMO';
  const expected = crypto.createHmac('sha256',webhookSecret).update(rawBody).digest('hex');
  return !!signature && expected.length === String(signature).length && crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(String(signature)));
}

async function refund({
  paymentId,
  amount,
  notes = {},
  idempotencyKey,
}) {
  const normalizedKey =
    String(
      idempotencyKey || '',
    ).trim()

  if (
    normalizedKey &&
    !/^[A-Za-z0-9_-]{10,200}$/.test(
      normalizedKey,
    )
  ) {
    throw new Error(
      'Refund idempotency key must be 10-200 characters using letters, numbers, hyphens or underscores only.',
    )
  }

  if (provider === 'DEMO') {
    return {
      id:
        normalizedKey
          ? `rfnd_demo_${normalizedKey}`
          : `rfnd_demo_${crypto.randomUUID()}`,
      payment_id:
        paymentId,
      amount:
        Math.round(
          Number(amount) * 100,
        ),
      status:
        'processed',
      notes,
    }
  }

  return razorpay(
    `/payments/${paymentId}/refund`,
    {
      method:
        'POST',
      headers:
        normalizedKey
          ? {
              'X-Refund-Idempotency':
                normalizedKey,
            }
          : {},
      body:
        JSON.stringify({
          amount:
            Math.round(
              Number(amount) * 100,
            ),
          notes,
        }),
    },
  )
}
module.exports = { provider, createOrder, verifyPaymentSignature, verifyWebhook, refund };
