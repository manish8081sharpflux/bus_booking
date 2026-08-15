const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const service=fs.readFileSync(
  path.join(
    __dirname,
    '../src/services/operator.service.js',
  ),
  'utf8',
)

test('operator creation checks PAN inside transaction',()=>{
  assert.match(
    service,
    /UPPER\(BTRIM\(tax_identifier\)\)[\s\S]*UPPER\(BTRIM\(\$1\)\)/,
  )

  assert.match(
    service,
    /data\.panNumber/,
  )
})

test('operator creation checks GSTIN inside transaction',()=>{
  assert.match(
    service,
    /UPPER\(BTRIM\(registration_number\)\)[\s\S]*UPPER\(BTRIM\(\$2\)\)/,
  )

  assert.match(
    service,
    /data\.gstRegistered[\s\S]*data\.gstin/,
  )
})

test('duplicate PAN returns a conflict',()=>{
  assert.match(
    service,
    /An operator already exists with this PAN Number\./,
  )

  assert.match(
    service,
    /error\.status = 409/,
  )
})

test('duplicate GSTIN returns a conflict',()=>{
  assert.match(
    service,
    /An operator already exists with this GSTIN\./,
  )
})

test('database unique violations are converted to safe conflict',()=>{
  assert.match(
    service,
    /error\?\.code === '23505'/,
  )

  assert.match(
    service,
    /operators_tax_identifier_unique_idx/,
  )

  assert.match(
    service,
    /operators_registration_number_unique_idx/,
  )

  assert.match(
    service,
    /Operator PAN or GSTIN is already registered\./,
  )
})