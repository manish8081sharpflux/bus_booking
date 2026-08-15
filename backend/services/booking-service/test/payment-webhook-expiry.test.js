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

const helperStart =
  source.indexOf(
    'async function assertWebhookBookingStillBookable(',
  )

const helperEnd =
  source.indexOf(
    'function rupeesFromPaise(',
    helperStart,
  )

assert.ok(
  helperStart >= 0 &&
  helperEnd > helperStart,
  'webhook eligibility helper missing',
)

const helper =
  source.slice(
    helperStart,
    helperEnd,
  )

const captureStart =
  source.indexOf(
    'async function processPaymentCaptured(',
  )

const captureEnd =
  source.indexOf(
    'async function processPaymentFailed(',
    captureStart,
  )

const capture =
  source.slice(
    captureStart,
    captureEnd,
  )

test('webhook eligibility requires unexpired booking', () => {
  assert.match(
    helper,
    /bk\.expires_at > NOW\(\)/,
  )
})

test('booking expiry is checked with trip and bus eligibility', () => {
  assert.match(
    helper,
    /bk\.id = \$1::uuid[\s\S]*bk\.expires_at > NOW\(\)[\s\S]*t\.status = 'SCHEDULED'/,
  )
})

test('eligibility helper still requires future trip', () => {
  assert.match(
    helper,
    /t\.departure_at > NOW\(\)/,
  )
})

test('eligibility helper still share-locks trip and bus', () => {
  assert.match(
    helper,
    /FOR SHARE OF t,b/,
  )
})

test('payment webhook checks eligibility before confirmation', () => {
  const guard =
    capture.indexOf(
      'assertWebhookBookingStillBookable(',
    )

  const confirmation =
    capture.indexOf(
      "SET status='CONFIRMED'",
    )

  assert.ok(
    guard >= 0 &&
    confirmation > guard,
  )
})

test('expired captured payment remains reconciliation path', () => {
  assert.match(
    capture,
    /RECONCILIATION_REQUIRED/,
  )

  assert.match(
    capture,
    /manual reconciliation\/refund is required/i,
  )
})