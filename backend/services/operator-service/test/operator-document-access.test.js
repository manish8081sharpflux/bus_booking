const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const controller=fs.readFileSync(path.join(__dirname,'../src/controllers/operator.controller.js'),'utf8')
const service=fs.readFileSync(path.join(__dirname,'../src/services/operator.service.js'),'utf8')
const routes=fs.readFileSync(path.join(__dirname,'../src/routes/operator.routes.js'),'utf8')

test('non-super-admin operator detail is organization scoped',()=>{
  assert.match(controller,/req\.auth\?\.organizationId/)
  assert.match(controller,/You can only access your own operator profile/)
})

test('operator detail maps documents without raw file path',()=>{
  const start=controller.indexOf('const safeDocuments =')
  const end=controller.indexOf('const approveOperator =',start)
  const block=controller.slice(start,end)
  assert.ok(start>=0 && end>start)
  assert.doesNotMatch(block,/file_path/)
})

test('KYC preview route is SUPER_ADMIN only',()=>{
  assert.match(routes,/\/:id\/documents\/:documentId\/preview/)
  assert.match(routes,/requireRoles\('SUPER_ADMIN'\)[\s\S]*previewOperatorDocument/)
})

test('KYC document lookup is scoped to operator and document id',()=>{
  assert.match(service,/WHERE id=\$1::uuid[\s\S]*AND operator_id=\$2::uuid/)
})

test('KYC preview constrains path to operator uploads',()=>{
  assert.match(controller,/path\.resolve\(process\.cwd\(\),'uploads','operators'\)/)
  assert.match(controller,/candidate\.startsWith\(uploadsRoot \+ path\.sep\)/)
})

test('KYC preview is no-store and nosniff',()=>{
  assert.match(controller,/'Cache-Control','private, no-store'/)
  assert.match(controller,/'X-Content-Type-Options','nosniff'/)
})

test('bank account stays masked in operator detail',()=>{
  assert.match(controller,/maskedAccountNumber/)
})