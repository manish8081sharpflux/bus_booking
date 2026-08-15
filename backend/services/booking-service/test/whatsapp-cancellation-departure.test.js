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

test('WhatsApp cancellation quote rejects departed trips', () => {
  const block =
    method(
      'async whatsappCancellationQuote(',
    )

  assert.match(
    block,
    /t\.departure_at>NOW\(\)/,
  )
})

test('WhatsApp final cancellation rechecks trip departure in transaction', () => {
  const block =
    method(
      'async whatsappCancelBooking(',
    )

  assert.match(
    block,
    /t\.departure_at>NOW\(\)/,
  )

  assert.match(
    block,
    /FOR SHARE OF t/,
  )
})

test('WhatsApp departed-trip cancellation returns conflict', () => {
  const block =
    method(
      'async whatsappCancelBooking(',
    )

  assert.match(
    block,
    /trip has departed/i,
  )

  assert.match(
    block,
    /409/,
  )
})

test('WhatsApp departure guard runs before refund policy and provider refund', () => {
  const block =
    method(
      'async whatsappCancelBooking(',
    )

  const guard =
    block.indexOf(
      'trip has departed',
    )

  const policy =
    block.indexOf(
      'cancellationPolicy(',
    )

  const providerRefund =
    block.indexOf(
      'paymentProvider.refund(',
    )

  assert.ok(guard >= 0)
  assert.ok(policy > guard)
  assert.ok(providerRefund > policy)
})

test('WhatsApp booking row remains locked before trip guard', () => {
  const block =
    method(
      'async whatsappCancelBooking(',
    )

  const bookingLock =
    block.indexOf(
      'FOR UPDATE',
    )

  const tripGuard =
    block.indexOf(
      'trip has departed',
    )

  assert.ok(
    bookingLock >= 0 &&
    tripGuard > bookingLock,
  )
})

test('normal and WhatsApp cancellation both contain future-trip protection', () => {
  const normal =
    method(
      'async cancelBookingForAuth(',
    )

  const whatsapp =
    method(
      'async whatsappCancelBooking(',
    )

  assert.match(
    normal,
    /t\.departure_at>NOW\(\)/,
  )

  assert.match(
    whatsapp,
    /t\.departure_at>NOW\(\)/,
  )
})