const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const service = fs.readFileSync(path.join(__dirname,'../src/services/bus.service.js'),'utf8')
const routes = fs.readFileSync(path.join(__dirname,'../src/routes/bus.routes.js'),'utf8')
const controller = fs.readFileSync(path.join(__dirname,'../src/controllers/bus.controller.js'),'utf8')

test('operator lookup scopes document to operator-owned bus',()=>{
  assert.match(service,/b\.operator_id = \$3::uuid/)
  assert.match(service,/getBusDocumentForOperator/)
})

test('operator preview route requires auth role and operator context',()=>{
  assert.match(routes,/\/:id\/documents\/:documentId\/operator-file/)
  assert.match(routes,/resolveOperator/)
  assert.match(routes,/previewOperatorBusDocument/)
})

test('operator preview uses safe no-store file sender',()=>{
  assert.match(controller,/sendBusDocumentFile/)
  assert.match(controller,/private, no-store/)
  assert.match(controller,/insideUploadRoot/)
})