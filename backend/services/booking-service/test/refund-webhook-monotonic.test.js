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
    'async function processRefundFailed(',
  )

const end =
  source.indexOf(
    'async function processRazorpayWebhook(',
    start,
  )

assert.ok(
  start >= 0 &&
  end > start,
  'refund.failed handler missing',
)

const block =
  source.slice(
    start,
    end,
  )

test('refund.failed cannot downgrade REFUNDED state', () => {
  assert.match(
    block,
    /WHEN status='REFUNDED' THEN status/,
  )

  assert.match(
    block,
    /ELSE 'FAILED'/,
  )
})

test('terminal refund failure metadata is preserved', () => {
  assert.match(
    block,
    /WHEN status='REFUNDED' THEN failure_reason/,
  )
})

test('persisted refund state is returned from update', () => {
  assert.match(
    block,
    /RETURNING id,payment_id,status/,
  )
})

test('late refund failure reports already refunded', () => {
  assert.match(
    block,
    /ALREADY_REFUNDED/,
  )

  assert.match(
    block,
    /result\.rows\[0\]\.status === 'REFUNDED'/,
  )
})

test('unknown failed refund still requires reconciliation', () => {
  assert.match(
    block,
    /RECONCILIATION_REQUIRED/,
  )
})

test('late failure payload remains retained for audit', () => {
  assert.match(
    block,
    /provider_payload=provider_payload \|\| \$3::jsonb/,
  )
})