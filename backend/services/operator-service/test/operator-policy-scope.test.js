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

test('policy operator resolver detects SUPER_ADMIN',()=>{
  assert.match(
    source,
    /req\.auth\?\.roles\?\.includes\([\s\S]*'SUPER_ADMIN'/,
  )
})

test('SUPER_ADMIN policy operations target requested operator id',()=>{
  assert.match(
    source,
    /isSuperAdmin[\s\S]*\? req\.params\.id[\s\S]*: req\.auth\?\.organizationId/,
  )
})

test('operator policy operations use authenticated organization id',()=>{
  assert.match(
    source,
    /req\.auth\?\.organizationId/,
  )
})

test('missing operator context is rejected',()=>{
  assert.match(
    source,
    /Operator context is required\./,
  )
  assert.match(
    source,
    /error\.status = 403/,
  )
})

test('GET cancellation policy uses shared operator resolver',()=>{
  const start=source.indexOf(
    'module.exports.getCancellationPolicy',
  )
  const end=source.indexOf(
    'const previewOperatorDocument =',
    start,
  )
  const block=source.slice(start,end)

  assert.match(
    block,
    /resolvePolicyOperatorId\(/,
  )
  assert.match(
    block,
    /getCancellationPolicy\([\s\S]*operatorId/,
  )
})

test('PUT cancellation policy uses same shared operator resolver',()=>{
  const start=source.indexOf(
    'module.exports.upsertCancellationPolicy',
  )
  const end=source.indexOf(
    'module.exports.previewOperatorDocument',
    start,
  )
  const block=source.slice(start,end)

  assert.match(
    block,
    /resolvePolicyOperatorId\(/,
  )
  assert.match(
    block,
    /upsertCancellationPolicy\([\s\S]*operatorId/,
  )
})

test('PUT no longer hardcodes authenticated organization id',()=>{
  const start=source.indexOf(
    'module.exports.upsertCancellationPolicy',
  )
  const end=source.indexOf(
    'module.exports.previewOperatorDocument',
    start,
  )
  const block=source.slice(start,end)

  assert.doesNotMatch(
    block,
    /operatorId\s*:\s*req\.auth\.organizationId/,
  )
})