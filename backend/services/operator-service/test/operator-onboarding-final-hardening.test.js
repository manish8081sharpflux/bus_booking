const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const controller=fs.readFileSync(
  path.join(
    __dirname,
    '../src/controllers/operator.controller.js',
  ),
  'utf8',
)

const login=fs.readFileSync(
  path.join(
    __dirname,
    '../../../../frontend/src/pages/Operator/OperatorLoginPage.tsx',
  ),
  'utf8',
)

test('development token is not minted for suspended operator',()=>{
  assert.match(
    controller,
    /allowDevelopmentOperatorToken\(\)\s*&&\s*operator\.status !== 'SUSPENDED'/,
  )
})

test('development login routes suspended operator to status page',()=>{
  const start=
    login.indexOf(
      'const handleDevelopmentLogin',
    )

  const end=
    login.indexOf(
      'const handleSendOtp',
      start,
    )

  const block=
    login.slice(start,end)

  assert.match(
    block,
    /status === 'SUSPENDED'/,
  )

  assert.match(
    block,
    /localStorage\.removeItem\([\s\S]*'operator_access_token'/,
  )

  assert.match(
    block,
    /\/operator\/application-status/,
  )
})

test('OTP login routes suspended operator away from dashboard',()=>{
  const start=
    login.indexOf(
      'const handleVerifyOtp',
    )

  const end=
    login.indexOf(
      'const handleChangeNumber',
      start,
    )

  const block=
    login.slice(start,end)

  assert.match(
    block,
    /status === 'PENDING'[\s\S]*status === 'REJECTED'[\s\S]*status === 'SUSPENDED'/,
  )

  assert.match(
    block,
    /localStorage\.removeItem\([\s\S]*'operator_access_token'/,
  )
})

test('operator login is ASCII safe and contains no mojibake',()=>{
  for(const ch of login){
    assert.ok(
      ch.charCodeAt(0) <= 127,
      `non-ASCII character found: ${ch.charCodeAt(0)}`,
    )
  }
})

test('operator login keeps numeric mobile and OTP constraints',()=>{
  assert.match(
    login,
    /inputmode="numeric"/,
  )

  assert.match(
    login,
    /maxlength=\{10\}/,
  )

  assert.match(
    login,
    /maxlength=\{6\}/,
  )
})