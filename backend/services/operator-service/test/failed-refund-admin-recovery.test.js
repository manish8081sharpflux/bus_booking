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

const routes=fs.readFileSync(
  path.join(__dirname,'../src/routes/admin.routes.js'),
  'utf8',
)

test('failed refunds are surfaced as critical support issues',()=>{
  assert.match(service,/FAILED_REFUND/)
  assert.match(service,/WHERE r\.status='FAILED'/)
  assert.match(service,/'CRITICAL'/)
})

test('failed refund retry route remains SUPER_ADMIN protected',()=>{
  assert.match(
    routes,
    /router\.use\(requireAuth, requireRoles\('SUPER_ADMIN'\)\)/,
  )
  assert.match(
    routes,
    /router\.patch\('\/refunds\/:id\/retry', controller\.retryFailedRefund\)/,
  )
})

test('manual refund retry row-locks refund and payment',()=>{
  assert.match(
    service,
    /FOR UPDATE OF r,p/,
  )
})

test('only FAILED refunds can be retried',()=>{
  assert.match(
    service,
    /existing\.status!=='FAILED'/,
  )
  assert.match(
    service,
    /AND status='FAILED'/,
  )
})

test('manual retry requires refundable captured parent payment',()=>{
  assert.match(service,/'CAPTURED'/)
  assert.match(service,/'PARTIALLY_REFUNDED'/)
  assert.match(
    service,
    /parent payment is no longer in a refundable captured state/,
  )
})

test('manual retry requires provider payment id',()=>{
  assert.match(
    service,
    /!existing\.provider_payment_id/,
  )
})

test('manual retry resets retry queue state',()=>{
  assert.match(
    service,
    /SET status='PENDING'/,
  )
  assert.match(
    service,
    /retry_count=0/,
  )
  assert.match(
    service,
    /next_retry_at=NOW\(\)/,
  )
  assert.match(
    service,
    /failure_message=NULL/,
  )
})

test('manual refund retry is audited',()=>{
  assert.match(
    service,
    /RETRY_FAILED_REFUND/,
  )
  assert.match(
    service,
    /entity_type,[\s\S]*'REFUND'/,
  )
})

test('controller derives actor from authenticated request',()=>{
  assert.match(
    controller,
    /actorAuthUserId:req\.auth\?\.userId\|\|null/,
  )
})