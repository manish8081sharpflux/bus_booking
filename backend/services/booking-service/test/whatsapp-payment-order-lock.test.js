const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(
  path.join(__dirname,'../src/services/booking.service.js'),
  'utf8',
)

const start=source.indexOf('async whatsappCheckoutOrder(')
const end=source.indexOf('\n  async whatsappCheckoutVerify(',start)

assert.ok(start>=0 && end>start,'WhatsApp payment-order method missing')

const block=source.slice(start,end)

test('WhatsApp payment order locks booking row',()=>{
  assert.match(block,/FROM bookings[\s\S]*FOR UPDATE/)
})

test('WhatsApp payment order is transactional',()=>{
  assert.match(block,/BEGIN/)
  assert.match(block,/COMMIT/)
  assert.match(block,/ROLLBACK/)
})

test('WhatsApp payment order rechecks booking expiry after lock',()=>{
  assert.match(block,/lockedBooking\.expires_at/)
  assert.match(block,/lockedBooking\.status!=='PENDING_PAYMENT'/)
})

test('existing pending order lookup happens under same transaction',()=>{
  const bookingLock=block.indexOf('FROM bookings')
  const existingLookup=block.indexOf("status='PENDING'")
  const providerCall=block.indexOf('paymentProvider.createOrder(')

  assert.ok(
    bookingLock>=0 &&
    existingLookup>bookingLock &&
    providerCall>existingLookup
  )
})

test('existing pending provider order is row locked and reused',()=>{
  assert.match(block,/provider_order_id IS NOT NULL[\s\S]*FOR UPDATE/)
  assert.match(block,/reused:true/)
})

test('new provider order is created only after serialized reuse check',()=>{
  const existing=block.indexOf('const existingPayment=')
  const provider=block.indexOf('paymentProvider.createOrder(')
  assert.ok(existing>=0 && provider>existing)
})

test('transaction client is released in finally',()=>{
  assert.match(block,/finally[\s\S]*client\.release\(\)/)
})