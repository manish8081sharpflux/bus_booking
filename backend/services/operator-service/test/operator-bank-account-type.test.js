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

const service=fs.readFileSync(
  path.join(
    __dirname,
    '../src/services/operator.service.js',
  ),
  'utf8',
)

test('registration requires supported account type',()=>{
  assert.match(
    controller,
    /const normalizedAccountType =/,
  )

  assert.match(
    controller,
    /\['CURRENT', 'SAVINGS'\]\.includes/,
  )

  assert.match(
    controller,
    /Account Type must be Current Account or Savings Account\./,
  )
})

test('frontend labels normalize to database values',()=>{
  assert.match(
    controller,
    /\.replace\(\/\\s\+ACCOUNT\$\/, ''\)/,
  )
})

test('registration sends normalized account type to service',()=>{
  assert.match(
    controller,
    /accountType:[\s\S]*normalizedAccountType/,
  )
})

test('operator bank insert stores account_type',()=>{
  const start=
    service.indexOf(
      'INSERT INTO operator_bank_details',
    )

  const end=
    service.indexOf(
      'DOCUMENT HELPER',
      start,
    )

  const block=
    service.slice(
      start,
      end,
    )

  assert.match(
    block,
    /account_type/,
  )

  assert.match(
    block,
    /\$7/,
  )

  assert.match(
    block,
    /data\.accountType/,
  )
})

test('operator detail query and response expose account type',()=>{
  assert.match(
    service,
    /b\.account_type/,
  )

  assert.match(
    controller,
    /accountType:[\s\S]*operator\.account_type/,
  )
})