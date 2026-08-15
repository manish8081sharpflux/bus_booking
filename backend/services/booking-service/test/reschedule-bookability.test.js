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

const block = (
  marker,
) => {
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

test('reschedule quote uses runtime bus bookability', () => {
  const quote =
    block(
      'async rescheduleQuote(',
    )

  assert.match(
    quote,
    /JOIN buses b ON b\.id=t\.bus_id/,
  )

  assert.match(
    quote,
    /\$\{customerBookabilityWhere\('b'\)\}/,
  )
})

test('reschedule quote still requires same operator and future scheduled trip', () => {
  const quote =
    block(
      'async rescheduleQuote(',
    )

  assert.match(
    quote,
    /t\.operator_id=\$4::uuid/,
  )

  assert.match(
    quote,
    /t\.status='SCHEDULED'/,
  )

  assert.match(
    quote,
    /t\.departure_at>NOW\(\)/,
  )
})

test('confirmReschedule rechecks target trip inside transaction', () => {
  const confirm =
    block(
      'async confirmReschedule(',
    )

  assert.match(
    confirm,
    /const lockedTargetTrip=/,
  )

  assert.match(
    confirm,
    /\$\{customerBookabilityWhere\('b'\)\}/,
  )
})

test('confirmReschedule share-locks target trip and bus', () => {
  const confirm =
    block(
      'async confirmReschedule(',
    )

  assert.match(
    confirm,
    /FOR SHARE OF t,b/,
  )
})

test('invalid replacement bus blocks final reschedule', () => {
  const confirm =
    block(
      'async confirmReschedule(',
    )

  assert.match(
    confirm,
    /replacement trip or bus is no longer available/i,
  )

  assert.match(
    confirm,
    /409/,
  )
})

test('target inventory remains locked after target-trip validation', () => {
  const confirm =
    block(
      'async confirmReschedule(',
    )

  const tripGuard =
    confirm.indexOf(
      'lockedTargetTrip',
    )

  const inventoryLock =
    confirm.indexOf(
      'FOR UPDATE OF i',
    )

  assert.ok(
    tripGuard >= 0 &&
    inventoryLock > tripGuard,
  )
})