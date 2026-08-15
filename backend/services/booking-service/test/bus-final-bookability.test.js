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

const start =
  source.indexOf(
    'async createBooking(',
  )

assert.ok(
  start >= 0,
  'createBooking missing',
)

const next =
  source.indexOf(
    '\n  async ',
    start + 20,
  )

const block =
  source.slice(
    start,
    next > start
      ? next
      : source.length,
  )

test('final booking rechecks runtime bus bookability', () => {
  assert.match(
    block,
    /\$\{customerBookabilityWhere\('b'\)\}/,
  )
})

test('final booking joins bus before runtime validation', () => {
  assert.match(
    block,
    /JOIN buses b ON b\.id=t\.bus_id/,
  )
})

test('final booking preserves trip row lock after eligibility guard', () => {
  const guard =
    block.indexOf(
      "${customerBookabilityWhere('b')}",
    )

  const lock =
    block.indexOf(
      'FOR UPDATE OF t',
    )

  assert.ok(
    guard >= 0,
  )

  assert.ok(
    lock > guard,
  )
})

test('final booking still requires scheduled future trip', () => {
  assert.match(
    block,
    /t\.status='SCHEDULED'/,
  )

  assert.match(
    block,
    /t\.departure_at>NOW\(\)/,
  )
})

test('quote validation remains before final trip lock', () => {
  const quote =
    block.indexOf(
      'booking_price_quotes',
    )

  const lock =
    block.indexOf(
      'FOR UPDATE OF t',
    )

  assert.ok(
    quote >= 0,
  )

  assert.ok(
    lock > quote,
  )
})