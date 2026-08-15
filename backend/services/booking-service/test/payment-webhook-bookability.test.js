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

test('webhook bookability requires active approved bus', () => {
  assert.match(
    source,
    /b\.status = 'ACTIVE'/,
  )

  assert.match(
    source,
    /b\.operational_status = 'ACTIVE'/,
  )

  assert.match(
    source,
    /b\.approval_status = 'APPROVED'/,
  )
})

test('webhook bookability requires verified non-expired compliance', () => {
  assert.match(
    source,
    /bc\.verification_status = 'VERIFIED'/,
  )

  assert.match(
    source,
    /bc\.insurance_expiry >= CURRENT_DATE/,
  )

  assert.match(
    source,
    /bc\.permit_expiry >= CURRENT_DATE/,
  )

  assert.match(
    source,
    /bc\.fitness_expiry >= CURRENT_DATE/,
  )
})

test('webhook bookability requires verified documents', () => {
  assert.match(
    source,
    /bd\.verification_status <> 'VERIFIED'/,
  )
})

test('webhook eligibility requires scheduled future trip', () => {
  assert.match(
    source,
    /t\.status = 'SCHEDULED'/,
  )

  assert.match(
    source,
    /t\.departure_at > NOW\(\)/,
  )
})

test('webhook eligibility share-locks trip and bus', () => {
  assert.match(
    source,
    /FOR SHARE OF t,b/,
  )
})

test('payment captured checks bookability before seat allocation confirmation', () => {
  const guard =
    block.indexOf(
      'assertWebhookBookingStillBookable(',
    )

  const allocation =
    block.indexOf(
      'const allocationCheck',
    )

  const bookingConfirm =
    block.indexOf(
      "SET status='CONFIRMED'",
    )

  assert.ok(
    guard >= 0,
  )

  assert.ok(
    allocation > guard,
  )

  assert.ok(
    bookingConfirm > allocation,
  )
})

test('captured payment on invalid bus requires reconciliation instead of confirmation', () => {
  assert.match(
    block,
    /trip or bus became ineligible/i,
  )

  assert.match(
    block,
    /RECONCILIATION_REQUIRED/,
  )

  assert.match(
    block,
    /manual reconciliation\/refund is required/i,
  )
})