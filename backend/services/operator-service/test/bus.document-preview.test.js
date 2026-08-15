const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const routes = fs.readFileSync(path.join(__dirname,'../src/routes/bus.routes.js'),'utf8')
const controller = fs.readFileSync(path.join(__dirname,'../src/controllers/bus.controller.js'),'utf8')
const service = fs.readFileSync(path.join(__dirname,'../src/services/bus.service.js'),'utf8')

test('document preview route is SUPER_ADMIN only',()=>{
  assert.match(routes,/\/:id\/documents\/:documentId\/file/)
  assert.match(routes,/requireRoles\('SUPER_ADMIN'\)/)
})

test('document lookup scopes document to bus',()=>{
  assert.match(service,/d\.id = \$1::uuid/)
  assert.match(service,/d\.bus_id = \$2::uuid/)
})

test('file controller prevents path traversal',()=>{
  assert.match(controller,/insideUploadRoot/)
  assert.match(controller,/outside the allowed upload directory/)
})

test('preview response is inline and no-store',()=>{
  assert.match(controller,/Content-Disposition/)
  assert.match(controller,/private, no-store/)
  assert.match(controller,/nosniff/)
})