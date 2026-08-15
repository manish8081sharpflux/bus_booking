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
    'async function processPaymentCaptured(',
  )

const end =
  source.indexOf(
    'async function processPaymentFailed(',
    start,
  )

assert.ok(
  start >= 0 &&
  end > start,
  'payment.captured handler missing',
)

const block =
  source.slice(
    start,
    end,
  )

test('captured payment clears stale failure code', () => {
  assert.match(
    block,
    /status='CAPTURED',[\s\S]*failure_code=NULL/,
  )
})

test('captured payment clears stale failure message', () => {
  assert.match(
    block,
    /failure_message=NULL/,
  )
})

test('failure metadata is cleared before provider payload audit append', () => {
  const clear =
    block.indexOf(
      'failure_code=NULL',
    )

  const payload =
    block.indexOf(
      'provider_payload=provider_payload',
    )

  assert.ok(
    clear >= 0 &&
    payload > clear,
  )
})

test('captured payment still preserves webhook audit payload', () => {
  assert.match(
    block,
    /provider_payload=provider_payload \|\| \$4::jsonb/,
  )
})

test('captured payment on expired booking still requires reconciliation', () => {
  assert.match(
    block,
    /booking_status !== 'PENDING_PAYMENT'/,
  )

  assert.match(
    block,
    /RECONCILIATION_REQUIRED/,
  )
})

test('refunded payment remains protected from capture downgrade', () => {
  assert.match(
    block,
    /\['REFUNDED', 'PARTIALLY_REFUNDED'\]\.includes\(row\.status\)/,
  )
})

test('provider payment id continues to be persisted on capture', () => {
  assert.match(
    block,
    /provider_payment_id=COALESCE\(provider_payment_id,\$2\)/,
  )
})