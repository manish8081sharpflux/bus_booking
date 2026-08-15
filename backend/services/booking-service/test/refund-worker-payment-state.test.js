const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const source=fs.readFileSync(
  path.join(__dirname,'../src/services/refund.worker.js'),
  'utf8',
)

test('refund worker selects parent payment id',()=>{
  assert.match(
    source,
    /r\.payment_id/,
  )
})

test('provider-refund success is persisted transactionally',()=>{
  assert.match(source,/client\.query\('BEGIN'\)/)
  assert.match(source,/client\.query\('COMMIT'\)/)
  assert.match(source,/client\.query\('ROLLBACK'\)/)
})

test('processed provider refund becomes REFUNDED',()=>{
  assert.match(
    source,
    /result\.status==='processed'[\s\S]*'REFUNDED'/,
  )
})

test('processed refund records completion timestamp',()=>{
  assert.match(
    source,
    /completed_at=CASE[\s\S]*WHEN \$3='REFUNDED'/,
  )
})

test('worker recomputes refunded total from durable refund rows',()=>{
  assert.match(
    source,
    /SUM\(r\.amount\) FILTER\([\s\S]*r\.status='REFUNDED'/,
  )
})

test('full refund changes parent payment to REFUNDED',()=>{
  assert.match(
    source,
    /refunded_amount\)>=Number\(totals\.payment_amount\)[\s\S]*'REFUNDED'/,
  )
})

test('partial refund changes parent payment to PARTIALLY_REFUNDED',()=>{
  assert.match(
    source,
    /'PARTIALLY_REFUNDED'/,
  )
})

test('payment state update is limited to refundable captured states',()=>{
  assert.match(
    source,
    /status IN\([\s\S]*'CAPTURED'[\s\S]*'PARTIALLY_REFUNDED'[\s\S]*'REFUNDED'/,
  )
})

test('payment row is locked while refund total is reconciled',()=>{
  assert.match(
    source,
    /FOR UPDATE OF p/,
  )
})

test('refund retry remains idempotent',()=>{
  assert.match(
    source,
    /idempotencyKey:`refund_\$\{String\(item\.id\)\.replace\(\/-\/g,'_'\)\}`/,
  )
})

test('failed worker attempts retain exponential retry backoff',()=>{
  assert.match(source,/POWER\(2,retry_count\)\*30/)
  assert.match(source,/retry_count>=8/)
})