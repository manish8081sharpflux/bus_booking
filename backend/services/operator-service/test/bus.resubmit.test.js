const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const service = fs.readFileSync(path.join(__dirname,'../src/services/bus.service.js'),'utf8')
const routes = fs.readFileSync(path.join(__dirname,'../src/routes/bus.routes.js'),'utf8')

test('only rejected buses can be resubmitted',()=>{
  assert.match(service,/BUS_NOT_REJECTED/)
  assert.match(service,/Only rejected buses can be resubmitted/)
})

test('resubmit requires a correction after review',()=>{
  assert.match(service,/BUS_RESUBMIT_NO_CHANGES/)
  assert.match(service,/Make the required correction before resubmitting/)
  assert.match(service,/last_related_update/)
})

test('resubmit always returns bus to pending and inactive',()=>{
  assert.match(service,/approval_status = 'PENDING_APPROVAL'/)
  assert.match(service,/operational_status = 'INACTIVE'/)
})

test('manager and operator admin may resubmit',()=>{
  assert.match(routes,/resubmit[^\n]*OPERATOR_ADMIN[^\n]*MANAGER/)
})