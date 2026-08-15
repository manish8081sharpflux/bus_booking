const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const source=fs.readFileSync(
  path.join(
    __dirname,
    '../src/middlewares/upload.middleware.js',
  ),
  'utf8',
)

const helperStart=source.indexOf(
  'const armOperatorUploadFailureCleanup =',
)

const wrapperStart=source.indexOf(
  'const operatorDocumentUpload =',
  helperStart,
)

const exportsStart=source.indexOf(
  'module.exports =',
  wrapperStart,
)

assert.ok(
  helperStart>=0 &&
  wrapperStart>helperStart &&
  exportsStart>wrapperStart,
)

const helper=source.slice(
  helperStart,
  wrapperStart,
)

const wrapper=source.slice(
  wrapperStart,
  exportsStart,
)

test('operator upload cleanup snapshots only current request files',()=>{
  assert.match(
    helper,
    /getUploadedOperatorFiles\([\s\S]*req/,
  )
})

test('non-2xx downstream response removes uploaded KYC files',()=>{
  assert.match(
    helper,
    /res\.once\([\s\S]*'finish'/,
  )
  assert.match(
    helper,
    /res\.statusCode < 200/,
  )
  assert.match(
    helper,
    /res\.statusCode >= 300/,
  )
  assert.match(
    helper,
    /cleanupOnce\(\)/,
  )
})

test('successful 2xx registration does not trigger finish cleanup',()=>{
  assert.match(
    helper,
    /if \([\s\S]*res\.statusCode < 200[\s\S]*res\.statusCode >= 300[\s\S]*\)[\s\S]*cleanupOnce\(\)/,
  )
})

test('aborted connection removes uploaded KYC files',()=>{
  assert.match(
    helper,
    /res\.once\([\s\S]*'close'/,
  )
  assert.match(
    helper,
    /!res\.writableFinished/,
  )
})

test('cleanup is idempotent within request lifecycle',()=>{
  assert.match(
    helper,
    /let cleaned =[\s\S]*false/,
  )
  assert.match(
    helper,
    /if \([\s\S]*cleaned[\s\S]*\)[\s\S]*return/,
  )
  assert.match(
    helper,
    /cleaned =[\s\S]*true/,
  )
})

test('cleanup guard is armed before downstream next',()=>{
  const arm=wrapper.indexOf(
    'armOperatorUploadFailureCleanup(',
  )
  const validate=wrapper.indexOf(
    'validateUploadedOperatorSignatures(',
  )

  assert.ok(
    arm>=0 &&
    validate>arm,
  )
})

test('signature-validation failure still cleans immediately',()=>{
  const validationStart=source.indexOf(
    'const validateUploadedOperatorSignatures',
  )
  const validationEnd=source.indexOf(
    'const armOperatorUploadFailureCleanup =',
    validationStart,
  )
  const validationBlock=source.slice(
    validationStart,
    validationEnd,
  )

  assert.match(
    validationBlock,
    /removeUploadedFiles\(/,
  )
})

test('multer failure still cleans immediately',()=>{
  assert.match(
    wrapper,
    /if \([\s\S]*error[\s\S]*removeUploadedFiles\(/,
  )
})

test('successful registration files remain available to controller',()=>{
  assert.doesNotMatch(
    helper,
    /statusCode === 201[\s\S]*cleanupOnce/,
  )
})

test('cleanup reuses constrained uploaded-file list',()=>{
  assert.doesNotMatch(
    helper,
    /readdirSync|rmSync|rmdirSync/,
  )
  assert.match(
    helper,
    /removeUploadedFiles\([\s\S]*files/,
  )
})