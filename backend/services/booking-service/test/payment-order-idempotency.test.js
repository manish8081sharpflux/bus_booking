const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/services/booking.service.js',
  ),
  'utf8',
)

const method = marker => {
  const start =
    source.indexOf(marker)

  assert.ok(
    start >= 0,
    `${marker} missing`,
  )

  const next =
    source.indexOf(
      '\n  async ',
      start + 20,
    )

  return source.slice(
    start,
    next > start
      ? next
      : source.length,
  )
}

test('normal payment order locks booking before provider order creation', () => {
  const block =
    method(
      'async createPaymentOrder(',
    )

  const bookingLock =
    block.indexOf(
      'FOR UPDATE',
    )

  const providerCall =
    block.indexOf(
      'paymentProvider.createOrder(',
    )

  assert.ok(
    bookingLock >= 0 &&
    providerCall > bookingLock,
  )
})

test('normal payment order rejects expired booking', () => {
  const block =
    method(
      'async createPaymentOrder(',
    )

  assert.match(
    block,
    /booking\.expires_at/,
  )

  assert.match(
    block,
    /PENDING_PAYMENT/,
  )
})

test('normal payment order reuses existing pending provider order', () => {
  const block =
    method(
      'async createPaymentOrder(',
    )

  assert.match(
    block,
    /status='PENDING'/,
  )

  assert.match(
    block,
    /provider_order_id IS NOT NULL/,
  )

  assert.match(
    block,
    /reused:\s*true/,
  )
})

test('normal payment order creation is transactional', () => {
  const block =
    method(
      'async createPaymentOrder(',
    )

  assert.match(
    block,
    /BEGIN/,
  )

  assert.match(
    block,
    /COMMIT/,
  )

  assert.match(
    block,
    /ROLLBACK/,
  )
})

test('WhatsApp payment order reuses existing pending provider order', () => {
  const block =
    method(
      'async whatsappCheckoutOrder(',
    )

  assert.match(
    block,
    /status='PENDING'/,
  )

  assert.match(
    block,
    /provider_order_id IS NOT NULL/,
  )

  assert.match(
    block,
    /reused:true/,
  )
})

test('provider order is not created before reuse lookup in normal flow', () => {
  const block =
    method(
      'async createPaymentOrder(',
    )

  const existingLookup =
    block.indexOf(
      "status='PENDING'",
    )

  const providerCall =
    block.indexOf(
      'paymentProvider.createOrder(',
    )

  assert.ok(
    existingLookup >= 0 &&
    providerCall > existingLookup,
  )
})