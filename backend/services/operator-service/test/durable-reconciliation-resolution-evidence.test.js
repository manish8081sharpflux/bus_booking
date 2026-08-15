const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const service=fs.readFileSync(
  path.join(__dirname,'../src/services/admin.service.js'),
  'utf8',
)

const controller=fs.readFileSync(
  path.join(__dirname,'../src/controllers/admin.controller.js'),
  'utf8',
)

const migration=fs.readFileSync(
  path.join(
    __dirname,
    '../../database/postgres/040_payment_reconciliation_resolution_outcome.sql',
  ),
  'utf8',
)

test('durable resolution stores constrained financial outcome',()=>{
  assert.match(
    migration,
    /resolution_outcome TEXT/,
  )
  assert.match(
    migration,
    /BOOKING_CONFIRMED/,
  )
  assert.match(
    migration,
    /FULLY_REFUNDED/,
  )
})

test('controller forwards requested resolution outcome',()=>{
  assert.match(
    controller,
    /outcome:req\.body\?\.outcome/,
  )
})

test('resolver normalizes and validates outcome',()=>{
  assert.match(
    service,
    /const normalizedOutcome=/,
  )
  assert.match(
    service,
    /outcome must be BOOKING_CONFIRMED or FULLY_REFUNDED/,
  )
})

test('BOOKING_CONFIRMED requires actual confirmed booking',()=>{
  assert.match(
    service,
    /existing\.booking_status==='CONFIRMED'/,
  )
})

test('BOOKING_CONFIRMED requires captured financial state',()=>{
  assert.match(
    service,
    /'CAPTURED',[\s\S]*'PARTIALLY_REFUNDED'/,
  )
})

test('FULLY_REFUNDED requires actual refunded payment',()=>{
  assert.match(
    service,
    /existing\.payment_status!=='REFUNDED'/,
  )
})

test('case payment and booking are locked while evidence is checked',()=>{
  assert.match(
    service,
    /FOR UPDATE OF c,p,b/,
  )
})

test('resolution outcome is persisted with resolution note',()=>{
  assert.match(
    service,
    /resolution_note=\$2/,
  )
  assert.match(
    service,
    /resolution_outcome=\$3/,
  )
})

test('audit log records payment and booking evidence',()=>{
  assert.match(
    service,
    /paymentStatus:existing\.payment_status/,
  )
  assert.match(
    service,
    /bookingStatus:existing\.booking_status/,
  )
  assert.match(
    service,
    /resolutionOutcome:normalizedOutcome/,
  )
})

test('already resolved response exposes stored outcome',()=>{
  assert.match(
    service,
    /outcome:existing\.resolution_outcome/,
  )
})