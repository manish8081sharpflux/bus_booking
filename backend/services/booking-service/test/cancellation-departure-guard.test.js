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
  const start=source.indexOf(marker)
  assert.ok(start>=0,`${marker} missing`)
  const next=source.indexOf('\n  async ',start+20)
  return source.slice(
    start,
    next>start?next:source.length,
  )
}

test('cancellation quote only permits future trips',()=>{
  const block=method('async cancellationQuote(')
  assert.match(
    block,
    /t\.departure_at>NOW\(\)/,
  )
})

test('final cancellation rechecks future departure inside transaction',()=>{
  const block=method('async cancelBookingForAuth(')

  assert.match(
    block,
    /t\.departure_at>NOW\(\)/,
  )

  assert.match(
    block,
    /FOR SHARE OF t/,
  )
})

test('departed trip cancellation returns conflict',()=>{
  const block=method('async cancelBookingForAuth(')

  assert.match(
    block,
    /trip has departed/i,
  )

  assert.match(
    block,
    /409/,
  )
})

test('departure guard runs before refund calculation',()=>{
  const block=method('async cancelBookingForAuth(')

  const guard=block.indexOf('trip has departed')
  const policy=block.indexOf('cancellationPolicy(')
  const refund=block.indexOf('paymentProvider.refund(')

  assert.ok(guard>=0)
  assert.ok(policy>guard)
  assert.ok(refund>policy)
})

test('booking remains row locked before departure validation',()=>{
  const block=method('async cancelBookingForAuth(')

  const bookingLock=block.indexOf('FOR UPDATE')
  const departureGuard=block.indexOf('trip has departed')

  assert.ok(
    bookingLock>=0 &&
    departureGuard>bookingLock,
  )
})