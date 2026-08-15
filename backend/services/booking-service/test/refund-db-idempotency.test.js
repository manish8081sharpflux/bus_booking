const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const booking = fs.readFileSync(
  path.join(
    __dirname,
    '../src/services/booking.service.js',
  ),
  'utf8',
)

const migration = fs.readFileSync(
  path.join(
    __dirname,
    '../../database/postgres/036_refund_operation_idempotency.sql',
  ),
  'utf8',
)

test('refund migration adds operation key', () => {
  assert.match(
    migration,
    /ADD COLUMN IF NOT EXISTS operation_key TEXT/,
  )
})

test('refund operation key has DB-level uniqueness', () => {
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS refunds_operation_key_unique_idx/,
  )

  assert.match(
    migration,
    /WHERE operation_key IS NOT NULL/,
  )
})

test('refund operation key format matches provider idempotency rules', () => {
  assert.match(
    migration,
    /\^\[A-Za-z0-9_-\]\{10,200\}\$/,
  )
})

test('normal cancellation persists cancellation operation key', () => {
  assert.match(
    booking,
    /INSERT INTO refunds\(payment_id,operation_key,provider_refund_id/,
  )

  const matches =
    booking.match(
      /`cancel_\$\{id\}`/g,
    ) || []

  assert.ok(
    matches.length >= 4,
    'provider calls and DB rows should share cancellation key',
  )
})

test('reschedule persists the same operation key used by provider', () => {
  const matches =
    booking.match(
      /`reschedule_\$\{id\}_\$\{String\(quote\.newTripId\)\.replace\(\/-\/g,'_'\)\}`/g,
    ) || []

  assert.ok(
    matches.length >= 2,
    'reschedule provider request and refund row must share operation key',
  )
})

test('all three direct refund inserts persist operation key', () => {
  const inserts =
    booking.match(
      /INSERT INTO refunds\(payment_id,operation_key,provider_refund_id/g,
    ) || []

  assert.equal(
    inserts.length,
    3,
  )
})

test('historical refund rows remain migration-compatible', () => {
  assert.doesNotMatch(
    migration,
    /operation_key TEXT NOT NULL/,
  )

  assert.match(
    migration,
    /operation_key IS NULL/,
  )
})