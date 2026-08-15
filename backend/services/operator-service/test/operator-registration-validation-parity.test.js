const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const source=fs.readFileSync(
  path.join(
    __dirname,
    '../src/controllers/operator.controller.js',
  ),
  'utf8',
)

const start=
  source.indexOf(
    'const registerOperator =',
  )

const end=
  source.indexOf(
    'const applicationStatus =',
    start,
  )

const block=
  source.slice(
    start,
    end,
  )

test('backend caps travels name like frontend',()=>{
  assert.match(
    block,
    /finalTravelsName\.length > 100/,
  )
})

test('backend restricts travels-name characters',()=>{
  assert.match(
    block,
    /Travels Name contains invalid characters\./,
  )
})

test('backend caps owner name like frontend',()=>{
  assert.match(
    block,
    /normalizedOwnerName\.length > 80/,
  )
})

test('backend restricts owner-name characters',()=>{
  assert.match(
    block,
    /Owner Name contains invalid characters\./,
  )
})

test('business background is allow-listed',()=>{
  assert.match(
    source,
    /OPERATOR_BUSINESS_BACKGROUNDS/,
  )

  assert.match(
    block,
    /Invalid Business Background\./,
  )
})

test('district city and address lengths are validated',()=>{
  assert.match(
    block,
    /normalizedDistrict\.length < 2/,
  )

  assert.match(
    block,
    /normalizedCity\.length > 80/,
  )

  assert.match(
    block,
    /normalizedAddress\.length > 300/,
  )
})

test('GST selection rejects unknown values',()=>{
  assert.match(
    source,
    /const parseGstRegistered =/,
  )

  assert.match(
    block,
    /GST registration selection is invalid\./,
  )
})

test('GSTIN PAN identity must match',()=>{
  assert.match(
    block,
    /normalizedGstin\.slice\([\s\S]*2,[\s\S]*12,[\s\S]*\) !== normalizedPan/,
  )

  assert.match(
    block,
    /GSTIN does not match the submitted PAN Number\./,
  )
})

test('existing bank and tax format validation remains',()=>{
  assert.match(
    block,
    /\^\[0-9\]\{9,18\}\$/,
  )

  assert.match(
    block,
    /\^\[A-Z\]\{4\}0\[A-Z0-9\]\{6\}\$/,
  )

  assert.match(
    block,
    /\^\[A-Z\]\{5\}\[0-9\]\{4\}\[A-Z\]\$/,
  )
})