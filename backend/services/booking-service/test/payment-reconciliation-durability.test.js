const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const service = fs.readFileSync(
  path.join(
    __dirname,
    '../src/services/payment-webhook.service.js',
  ),
  'utf8',
)

const migration = fs.readFileSync(
  path.join(
    __dirname,
    '../../database/postgres/039_payment_reconciliation_cases.sql',
  ),
  'utf8',
)

test('reconciliation cases have durable payment and booking references', () => {
  assert.match(
    migration,
    /payment_id UUID NOT NULL REFERENCES payments/,
  )

  assert.match(
    migration,
    /booking_id UUID NOT NULL REFERENCES bookings/,
  )
})

test('only one open reconciliation case may exist per payment', () => {
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS payment_reconciliation_one_open_case_idx/,
  )

  assert.match(
    migration,
    /WHERE status='OPEN'/,
  )
})

test('repeated reconciliation signals increment occurrence count', () => {
  assert.match(
    service,
    /occurrence_count=payment_reconciliation_cases\.occurrence_count\+1/,
  )
})

test('invalid booking state creates durable reconciliation case', () => {
  assert.match(
    service,
    /BOOKING_STATE_INVALID/,
  )
})

test('invalid bus or trip creates durable reconciliation case', () => {
  assert.match(
    service,
    /BOOKABILITY_INVALID/,
  )
})

test('released seat hold creates durable reconciliation case', () => {
  assert.match(
    service,
    /SEAT_HOLD_RELEASED/,
  )
})

test('reconciliation case is persisted before webhook is marked processed', () => {
  const captureStart =
    service.indexOf(
      'async function processPaymentCaptured(',
    )

  const captureEnd =
    service.indexOf(
      'async function processPaymentFailed(',
      captureStart,
    )

  const block =
    service.slice(
      captureStart,
      captureEnd,
    )

  const message =
    block.indexOf(
      'Payment captured for booking in',
    )

  const persist =
    block.indexOf(
      'upsertPaymentReconciliationCase(',
      message,
    )

  const mark =
    block.indexOf(
      'await markEvent',
      message,
    )

  assert.ok(
    message >= 0 &&
    persist > message &&
    mark > persist,
  )
})

test('reconciliation case supports explicit resolution lifecycle', () => {
  assert.match(
    migration,
    /status IN \('OPEN','RESOLVED'\)/,
  )

  assert.match(
    migration,
    /resolved_at TIMESTAMPTZ/,
  )

  assert.match(
    migration,
    /resolution_note TEXT/,
  )
})