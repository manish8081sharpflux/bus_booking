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

const controller=fs.readFileSync(
  path.join(
    __dirname,
    '../src/controllers/operator.controller.js',
  ),
  'utf8',
)

test('resubmit accepts corrected profile and bank fields',()=>{
  assert.match(
    controller,
    /corrections:\s*\{/,
  )

  assert.match(
    controller,
    /travelsName:[\s\S]*req\.body\?\.travelsName/,
  )

  assert.match(
    controller,
    /accountType:[\s\S]*req\.body\?\.accountType/,
  )
})

test('resubmit retains PAN and GST validation',()=>{
  assert.match(
    service,
    /Invalid PAN Number\./,
  )

  assert.match(
    service,
    /Invalid GSTIN\./,
  )

  assert.match(
    service,
    /GSTIN does not match the submitted PAN Number\./,
  )
})

test('resubmit prevents duplicate PAN or GST identity',()=>{
  assert.match(
    service,
    /id <> \$1::uuid/,
  )

  assert.match(
    service,
    /Another operator already uses this PAN or GSTIN\./,
  )

  assert.match(
    service,
    /error\?\.code === '23505'/,
  )
})

test('bank correction validates account data',()=>{
  assert.match(
    service,
    /Invalid Bank Account Number\./,
  )

  assert.match(
    service,
    /Invalid IFSC Code\./,
  )

  assert.match(
    service,
    /Account Type must be Current Account or Savings Account\./,
  )
})

test('resubmit requires an actual change or rejected document',()=>{
  assert.match(
    service,
    /changedFields\.length === 0[\s\S]*replacements\.length === 0/,
  )

  assert.match(
    service,
    /At least one profile field or rejected KYC document must be corrected\./,
  )
})

test('profile correction updates existing records only',()=>{
  const start=
    service.indexOf(
      'const resubmitRejectedOperator = async',
    )

  const end=
    service.indexOf(
      'async function getOperatorStatusHistory',
      start,
    )

  const block=
    service.slice(
      start,
      end,
    )

  assert.match(
    block,
    /UPDATE operators[\s\S]*display_name[\s\S]*tax_identifier/,
  )

  assert.match(
    block,
    /UPDATE operator_bank_details[\s\S]*account_type/,
  )

  assert.doesNotMatch(
    block,
    /INSERT INTO operators/,
  )
})

test('resubmit reports changed fields',()=>{
  assert.match(
    service,
    /changedFields,/,
  )

  assert.match(
    controller,
    /changedFields:[\s\S]*result\.changedFields/,
  )
})