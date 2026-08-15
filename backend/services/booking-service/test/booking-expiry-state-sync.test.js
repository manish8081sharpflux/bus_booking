const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const migration = fs.readFileSync(
  path.join(
    __dirname,
    '../../database/postgres/037_booking_expiry_state_sync.sql',
  ),
  'utf8',
)

test('expired pending bookings become EXPIRED', () => {
  assert.match(
    migration,
    /UPDATE bookings[\s\S]*SET status='EXPIRED'/,
  )
})

test('only pending-payment bookings are expired', () => {
  assert.match(
    migration,
    /WHERE status='PENDING_PAYMENT'/,
  )
})

test('booking expiry requires a real elapsed expires_at', () => {
  assert.match(
    migration,
    /expires_at IS NOT NULL/,
  )

  assert.match(
    migration,
    /expires_at < NOW\(\)/,
  )
})

test('booking status is synchronized before segment hold deletion', () => {
  const bookingUpdate =
    migration.indexOf(
      'UPDATE bookings',
    )

  const allocationDelete =
    migration.indexOf(
      'DELETE FROM trip_seat_segment_allocations',
    )

  assert.ok(
    bookingUpdate >= 0 &&
    allocationDelete > bookingUpdate,
  )
})

test('segment holds are still released', () => {
  assert.match(
    migration,
    /DELETE FROM trip_seat_segment_allocations[\s\S]*status='HELD'[\s\S]*expires_at < NOW\(\)/,
  )
})

test('legacy trip seat inventory is still released', () => {
  assert.match(
    migration,
    /UPDATE trip_seat_inventory[\s\S]*status='AVAILABLE'/,
  )

  assert.match(
    migration,
    /hold_token=NULL/,
  )

  assert.match(
    migration,
    /booking_id=NULL/,
  )
})

test('cleanup function remains backward-compatible with integer return', () => {
  assert.match(
    migration,
    /RETURNS INTEGER/,
  )

  assert.match(
    migration,
    /RETURN released_count/,
  )
})

test('confirmed and cancelled bookings cannot be expired by cleanup', () => {
  assert.doesNotMatch(
    migration,
    /WHERE status IN \('PENDING_PAYMENT','CONFIRMED'/,
  )
})