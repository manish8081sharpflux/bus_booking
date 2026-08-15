const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/services/payment-webhook.service.js',
  ),
  'utf8',
)

const start =
  source.indexOf(
    'async function processRefundProcessed(',
  )

const end =
  source.indexOf(
    'async function processRefundFailed(',
    start,
  )

assert.ok(
  start >= 0 &&
  end > start,
  'refund.processed handler missing',
)

const block =
  source.slice(
    start,
    end,
  )

test('refund.processed locks existing logical refund before upsert', () => {
  assert.match(
    block,
    /WHERE provider_refund_id=\$1/,
  )

  assert.match(
    block,
    /FOR UPDATE/,
  )
})

test('already-refunded provider refund suppresses duplicate completion notification', () => {
  assert.match(
    block,
    /existingRefund\.status !== 'REFUNDED'/,
  )

  assert.match(
    block,
    /shouldNotifyRefundCompleted/,
  )
})

test('first successful refund still notifies customer', () => {
  assert.match(
    block,
    /!existingRefund/,
  )

  assert.match(
    block,
    /payment\.customer_id && shouldNotifyRefundCompleted/,
  )
})

test('failed-to-processed transition still sends completion notification', () => {
  assert.match(
    block,
    /existingRefund\.status !== 'REFUNDED'/,
  )
})

test('refund upsert remains provider-refund-idempotent', () => {
  assert.match(
    block,
    /ON CONFLICT\(provider_refund_id\) DO UPDATE SET/,
  )
})

test('payment refund totals are still recomputed after webhook upsert', () => {
  assert.match(
    block,
    /SUM\(amount\) FILTER\(WHERE status='REFUNDED'\)/,
  )

  assert.match(
    block,
    /PARTIALLY_REFUNDED/,
  )
})

test('REFUND_COMPLETED notification remains available for genuine transition', () => {
  assert.match(
    block,
    /'REFUND_COMPLETED'/,
  )
})