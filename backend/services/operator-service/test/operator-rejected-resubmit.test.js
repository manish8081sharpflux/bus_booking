const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const routes=fs.readFileSync(path.join(__dirname,'../src/routes/operator.routes.js'),'utf8')
const controller=fs.readFileSync(path.join(__dirname,'../src/controllers/operator.controller.js'),'utf8')
const service=fs.readFileSync(path.join(__dirname,'../src/services/operator.service.js'),'utf8')

test('resubmit route requires OPERATOR_ADMIN auth',()=>{
  const i=routes.indexOf("'/:id/resubmit'")
  const end=routes.indexOf(');',i)
  const block=routes.slice(i,end)
  assert.ok(i>=0)
  assert.match(block,/requireAuth/)
  assert.match(block,/requireRoles\('OPERATOR_ADMIN'\)/)
  assert.match(block,/operatorDocumentUpload/)
})

test('controller enforces own-operator scope',()=>{
  assert.match(controller,/You can only resubmit your own operator application\./)
  assert.match(controller,/req\.auth\?\.organizationId/)
})

test('only rejected applications can resubmit',()=>{
  assert.match(service,/current\.status !== 'REJECTED'/)
  assert.match(service,/Only a rejected operator application can be resubmitted\./)
})

test('resubmission requires meaningful correction note',()=>{
  assert.match(service,/note\.length < 5/)
  assert.match(service,/Correction note must be at least 5 characters\./)
})

test('resubmission requires at least one real correction',()=>{
  assert.match(service,/At least one profile field or rejected KYC document must be corrected\./)
})

test('only rejected document types can be replaced',()=>{
  assert.match(service,/latest\.verification_status !==[\s\S]*'REJECTED'/)
  assert.match(service,/is not currently rejected and cannot be replaced/)
})

test('replacement document returns to pending verification',()=>{
  assert.match(service,/INSERT INTO operator_documents[\s\S]*'PENDING'/)
})

test('successful correction moves REJECTED to PENDING',()=>{
  assert.match(service,/SET status = 'PENDING'::operator_status/)
  assert.match(service,/'REJECTED'::operator_status[\s\S]*'PENDING'::operator_status/)
})

test('status history records operator resubmission note',()=>{
  assert.match(service,/Operator resubmission:/)
  assert.match(service,/INSERT INTO operator_status_history/)
})

test('authenticated detail exposes rejection reason for correction UI',()=>{
  assert.match(controller,/rejectionReason:[\s\S]*operator\.rejection_reason/)
  assert.match(controller,/rejectedAt:[\s\S]*operator\.rejected_at/)
})