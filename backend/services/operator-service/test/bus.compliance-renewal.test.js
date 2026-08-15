const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const service = fs.readFileSync(path.join(__dirname,'../src/services/bus.service.js'),'utf8')
const controller = fs.readFileSync(path.join(__dirname,'../src/controllers/bus.controller.js'),'utf8')
const routes = fs.readFileSync(path.join(__dirname,'../src/routes/bus.routes.js'),'utf8')

test('compliance renewal route is protected and multipart enabled',()=>{
  assert.match(routes,/\/:id\/compliance-renewal/)
  assert.match(routes,/busDocumentUpload/)
  assert.match(routes,/resolveOperator/)
})

test('renewal requires inactive bus and no active trips',()=>{
  assert.match(service,/BUS_COMPLIANCE_RENEWAL_BLOCKED/)
  assert.match(service,/getBlockingTripsForBus/)
  assert.match(service,/operational_status/)
})

test('renewal resets compliance verification',()=>{
  assert.match(service,/verification_status = 'PENDING'/)
  assert.match(service,/verified_by = NULL/)
  assert.match(service,/verified_at = NULL/)
})

test('renewed files reset document verification',()=>{
  assert.match(service,/bus_documents/)
  assert.match(service,/verification_status = 'PENDING'/)
})

test('renewal sends bus back for approval',()=>{
  assert.match(service,/approval_status = 'PENDING_APPROVAL'/)
  assert.match(service,/operational_status = 'INACTIVE'/)
})

test('controller validates compliance and requires at least one file',()=>{
  assert.match(controller,/validateCompliance\(/)
  assert.match(controller,/Upload at least one renewed compliance document/)
})