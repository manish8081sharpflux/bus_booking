const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const source=fs.readFileSync(
  path.join(__dirname,'../src/services/admin.service.js'),
  'utf8',
)

test('admin reconciliation requires active approved bus',()=>{
  assert.match(source,/b\.status='ACTIVE'/)
  assert.match(source,/b\.operational_status='ACTIVE'/)
  assert.match(source,/b\.approval_status='APPROVED'/)
})

test('admin reconciliation requires current verified compliance',()=>{
  assert.match(source,/bc\.verification_status='VERIFIED'/)
  assert.match(source,/bc\.insurance_expiry>=CURRENT_DATE/)
  assert.match(source,/bc\.permit_expiry>=CURRENT_DATE/)
  assert.match(source,/bc\.fitness_expiry>=CURRENT_DATE/)
})

test('admin reconciliation requires verified documents',()=>{
  assert.match(source,/bd\.verification_status<>'VERIFIED'/)
})

test('admin reconciliation requires scheduled future trip',()=>{
  assert.match(source,/t\.status='SCHEDULED'/)
  assert.match(source,/t\.departure_at>NOW\(\)/)
})

test('admin reconciliation share-locks trip and bus',()=>{
  assert.match(source,/FOR SHARE OF t,b/)
})

test('manual confirm executes bookability guard before seat count',()=>{
  const branchStart=source.indexOf(
    "normalizedKind==='CAPTURED_PAYMENT_BOOKING_MISMATCH'"
  )
  const branchEnd=source.indexOf(
    "normalizedKind==='STALE_PENDING_PAYMENT'",
    branchStart,
  )
  const block=source.slice(branchStart,branchEnd)

  const guard=block.indexOf('assertAdminReconciliationBookable(')
  const counts=block.indexOf('const counts=')
  const confirm=block.indexOf("SET status='CONFIRMED'")

  assert.ok(guard>=0 && counts>guard && confirm>counts)
})

test('invalid trip or bus blocks manual confirmation',()=>{
  assert.match(
    source,
    /trip or bus is no longer eligible for customer booking/i,
  )
  assert.match(
    source,
    /Refund\/manual handling is required/i,
  )
})

test('durable open reconciliation cases are surfaced',()=>{
  assert.match(source,/FROM payment_reconciliation_cases c/)
  assert.match(source,/c\.status='OPEN'/)
  assert.match(source,/DURABLE_PAYMENT_RECONCILIATION/)
  assert.match(source,/items\.push\(\.\.\.durableCases\)/)
})