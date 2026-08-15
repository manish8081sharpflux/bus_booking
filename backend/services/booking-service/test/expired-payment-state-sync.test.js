const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const migration = fs.readFileSync(
  path.join(
    __dirname,
    '../../database/postgres/038_expired_payment_state_sync.sql',
  ),
  'utf8',
)

test('cleanup still expires pending-payment bookings', () => {
  assert.match(
    migration,
    /UPDATE bookings[\s\S]*SET status='EXPIRED'/,
  )

  assert.match(
    migration,
    /WHERE status='PENDING_PAYMENT'/,
  )
})

test('expired bookings fail only pending payments', () => {
  assert.match(
    migration,
    /UPDATE payments p[\s\S]*p\.status='PENDING'/,
  )

  assert.match(
    migration,
    /b\.status='EXPIRED'/,
  )
})

test('expired payment receives explicit lifecycle reason', () => {
  assert.match(
    migration,
    /BOOKING_EXPIRED/,
  )

  assert.match(
    migration,
    /Booking payment window expired before payment capture\./,
  )
})

test('payment state sync runs before seat release', () => {
  const paymentUpdate =
    migration.indexOf(
      'UPDATE payments p',
    )

  const segmentDelete =
    migration.indexOf(
      'DELETE FROM trip_seat_segment_allocations',
    )

  assert.ok(
    paymentUpdate >= 0 &&
    segmentDelete > paymentUpdate,
  )
})

test('captured or refunded payments are not directly downgraded', () => {
  assert.doesNotMatch(
    migration,
    /p\.status IN \('PENDING','CAPTURED'/,
  )

  assert.doesNotMatch(
    migration,
    /p\.status IN \('PENDING','REFUNDED'/,
  )

  assert.doesNotMatch(
    migration,
    /p\.status<>'REFUNDED'/,
  )
})

test('existing failure metadata is preserved', () => {
  assert.match(
    migration,
    /failure_code=COALESCE\(/,
  )

  assert.match(
    migration,
    /failure_message=COALESCE\(/,
  )
})

test('segment holds and legacy inventory remain released', () => {
  assert.match(
    migration,
    /DELETE FROM trip_seat_segment_allocations/,
  )

  assert.match(
    migration,
    /UPDATE trip_seat_inventory/,
  )

  assert.match(
    migration,
    /status='AVAILABLE'/,
  )
})

test('cleanup keeps its integer return contract', () => {
  assert.match(
    migration,
    /RETURNS INTEGER/,
  )

  assert.match(
    migration,
    /RETURN released_count/,
  )
})