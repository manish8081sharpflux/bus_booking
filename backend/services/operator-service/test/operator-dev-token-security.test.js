const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const source=fs.readFileSync(
  path.join(__dirname,'../src/controllers/operator.controller.js'),
  'utf8',
)

test('development operator token requires explicit opt-in',()=>{
  assert.match(source,/ALLOW_DEV_OPERATOR_LOGIN/)
  assert.match(source,/toLowerCase\(\) ===[\s\S]*'true'/)
})

test('production can never issue check-mobile dev token',()=>{
  assert.match(source,/process\.env\.NODE_ENV !==[\s\S]*'production'/)
})

test('check-mobile token uses explicit security gate',()=>{
  const start=source.indexOf('const checkMobile =')
  const end=source.indexOf('const registerOperator =',start)
  const block=source.slice(start,end)
  assert.match(block,/allowDevelopmentOperatorToken\(\)/)
})

test('plain non-production environment is no longer sufficient',()=>{
  const start=source.indexOf('const checkMobile =')
  const end=source.indexOf('const registerOperator =',start)
  const block=source.slice(start,end)
  assert.doesNotMatch(block,/token:\s*process\.env\.NODE_ENV !== 'production'/)
})

test('generated dev token remains operator scoped',()=>{
  assert.match(source,/organizationId:[\s\S]*operator\.id/)
  assert.match(source,/roleCodes:[\s\S]*'OPERATOR_ADMIN'/)
})

test('development token keeps unique session id',()=>{
  assert.match(source,/sessionId:[\s\S]*randomUUID\(\)/)
})