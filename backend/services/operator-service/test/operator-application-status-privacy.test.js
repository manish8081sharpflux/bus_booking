const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const source=fs.readFileSync(
  path.join(__dirname,'../src/controllers/operator.controller.js'),
  'utf8',
)

const start=source.indexOf('const applicationStatus =')
const end=source.indexOf('const listOperators =',start)
const block=source.slice(start,end)

test('application status still validates mobile shape',()=>{
  assert.match(block,/\^\[0-9\]\{10\}\$/)
})

test('application status returns only workflow status',()=>{
  assert.match(block,/success:\s*true/)
  assert.match(block,/status:[\s\S]*operator\.status/)
})

test('public status does not expose operator id',()=>{
  assert.doesNotMatch(block,/operator\.id/)
})

test('public status does not echo registered mobile',()=>{
  assert.doesNotMatch(block,/operator\.support_mobile/)
})

test('public status does not expose business identity',()=>{
  assert.doesNotMatch(block,/operator\.display_name/)
  assert.doesNotMatch(block,/operator\.legal_name/)
})

test('public status does not expose internal timestamps',()=>{
  assert.doesNotMatch(block,/operator\.approved_at/)
  assert.doesNotMatch(block,/operator\.created_at/)
  assert.doesNotMatch(block,/operator\.updated_at/)
})

test('missing application does not expose another record',()=>{
  assert.match(block,/Operator application not found\./)
})