const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const provider = fs.readFileSync(
  path.join(__dirname,'../src/integrations/payment.provider.js'),
  'utf8',
)

const booking = fs.readFileSync(
  path.join(__dirname,'../src/services/booking.service.js'),
  'utf8',
)

const worker = fs.readFileSync(
  path.join(__dirname,'../src/services/refund.worker.js'),
  'utf8',
)

test('provider sends Razorpay refund idempotency header',()=>{
  assert.match(provider,/X-Refund-Idempotency/)
  assert.match(provider,/idempotencyKey/)
})

test('provider validates idempotency key format',()=>{
  assert.match(provider,/\^\[A-Za-z0-9_-\]\{10,200\}\$/)
})

test('demo provider uses deterministic refund id when keyed',()=>{
  assert.match(provider,/rfnd_demo_\$\{normalizedKey\}/)
})

test('normal and WhatsApp cancellation use the same stable operation key',()=>{
  const matches=booking.match(/idempotencyKey:`cancel_\$\{id\}`/g)||[]
  assert.equal(matches.length,2)
})

test('reschedule refund key is deterministic',()=>{
  assert.match(
    booking,
    /idempotencyKey:`reschedule_\$\{id\}_\$\{String\(quote\.newTripId\)\.replace\(\/-\/g,'_'\)\}`/,
  )
})

test('refund worker retry key derives from persistent refund row id',()=>{
  assert.match(
    worker,
    /idempotencyKey:`refund_\$\{String\(item\.id\)\.replace\(\/-\/g,'_'\)\}`/,
  )
})

test('worker retains retry backoff',()=>{
  assert.match(worker,/retry_count<8/)
  assert.match(worker,/next_retry_at/)
  assert.match(worker,/POWER\(2,retry_count\)/)
})