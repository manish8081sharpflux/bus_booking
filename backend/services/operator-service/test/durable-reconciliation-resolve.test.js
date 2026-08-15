const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const source=fs.readFileSync(
  path.join(__dirname,'../src/services/admin.service.js'),
  'utf8',
)

const start=source.indexOf(
  'async function resolvePaymentReconciliation(',
)

const end=source.indexOf(
  'module.exports.listPaymentReconciliation',
  start,
)

assert.ok(start>=0 && end>start)

const block=source.slice(start,end)

test('durable reconciliation supports explicit RESOLVE action',()=>{
  assert.match(
    block,
    /DURABLE_PAYMENT_RECONCILIATION/,
  )
  assert.match(
    block,
    /normalizedAction==='RESOLVE'/,
  )
})

test('durable reconciliation requires meaningful resolution note',()=>{
  assert.match(
    block,
    /cleanNote\.length<8/,
  )
  assert.match(
    block,
    /cleanNote\.length>1000/,
  )
})

test('durable reconciliation row is locked before resolution',()=>{
  assert.match(
    block,
    /FROM payment_reconciliation_cases[\s\S]*FOR UPDATE/,
  )
})

test('already resolved durable case is idempotent',()=>{
  assert.match(
    block,
    /existing\.status==='RESOLVED'/,
  )
  assert.match(
    block,
    /ALREADY_RESOLVED/,
  )
})

test('only OPEN durable cases transition to RESOLVED',()=>{
  assert.match(
    block,
    /SET status='RESOLVED'/,
  )
  assert.match(
    block,
    /AND status='OPEN'/,
  )
})

test('resolution timestamp and note are persisted',()=>{
  assert.match(
    block,
    /resolved_at=NOW\(\)/,
  )
  assert.match(
    block,
    /resolution_note=\$2/,
  )
})

test('durable case resolution is audited with authenticated actor',()=>{
  assert.match(
    block,
    /PAYMENT_RECONCILIATION_CASE/,
  )
  assert.match(
    block,
    /actorUserId/,
  )
  assert.match(
    block,
    /'RESOLVE'/,
  )
})

test('resolution commits before response',()=>{
  const update=block.indexOf(
    "SET status='RESOLVED'",
  )
  const commit=block.indexOf(
    "client.query('COMMIT')",
    update,
  )
  const response=block.indexOf(
    "action:'RESOLVE'",
    update,
  )

  assert.ok(
    update>=0 &&
    commit>update &&
    response>commit,
  )
})