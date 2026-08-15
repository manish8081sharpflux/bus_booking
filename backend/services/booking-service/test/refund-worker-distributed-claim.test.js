const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const source=fs.readFileSync(
  path.join(__dirname,'../src/services/refund.worker.js'),
  'utf8',
)

test('refund worker claims rows with SKIP LOCKED',()=>{
  assert.match(source,/FOR UPDATE SKIP LOCKED/)
})

test('refund worker claim is atomic update-returning',()=>{
  assert.match(source,/WITH candidates AS \(/)
  assert.match(source,/claimed AS \([\s\S]*UPDATE refunds r/)
  assert.match(source,/RETURNING[\s\S]*r\.id[\s\S]*r\.payment_id/)
})

test('claim increments retry counter exactly during claim',()=>{
  const matches=source.match(/retry_count=r\.retry_count\+1/g)||[]
  assert.equal(matches.length,1)
})

test('claimed refund receives crash-recovery lease',()=>{
  assert.match(
    source,
    /next_retry_at=NOW\(\)\+INTERVAL '5 minutes'/,
  )
})

test('worker still processes only pending retryable refunds',()=>{
  assert.match(source,/r\.status='PENDING'/)
  assert.match(source,/r\.retry_count<8/)
})

test('successful refund clears claim lease',()=>{
  assert.match(source,/next_retry_at=NULL/)
})

test('failed refund replaces lease with exponential backoff',()=>{
  assert.match(source,/POWER\(2,retry_count\)\*30/)
})

test('provider call retains deterministic idempotency key',()=>{
  assert.match(
    source,
    /idempotencyKey:`refund_\$\{String\(item\.id\)\.replace\(\/-\/g,'_'\)\}`/,
  )
})

test('old non-atomic retry update is removed',()=>{
  assert.doesNotMatch(
    source,
    /SET last_attempt_at=NOW\(\),\s*retry_count=retry_count\+1\s*WHERE id=\$1::uuid/,
  )
})

test('claim limits each worker batch',()=>{
  assert.match(
    source,
    /FOR UPDATE SKIP LOCKED[\s\S]*LIMIT 20/,
  )
})

test('payment state reconciliation from 4U remains intact',()=>{
  assert.match(source,/FOR UPDATE OF p/)
  assert.match(source,/'PARTIALLY_REFUNDED'/)
  assert.match(source,/'REFUNDED'/)
})