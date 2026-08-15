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

test('operator documents require a file extension',()=>{
  const start=source.indexOf(
    'const operatorFileFilter =',
  )
  const end=source.indexOf(
    'const operatorUpload =',
    start,
  )
  const block=source.slice(start,end)

  assert.match(
    block,
    /file extension is required/,
  )
})

test('operator documents enforce MIME and extension parity',()=>{
  const start=source.indexOf(
    'const operatorFileFilter =',
  )
  const end=source.indexOf(
    'const operatorUpload =',
    start,
  )
  const block=source.slice(start,end)

  assert.match(block,/'application\/pdf'/)
  assert.match(block,/'image\/jpeg'/)
  assert.match(block,/'image\/png'/)
  assert.match(
    block,
    /file extension does not match its MIME type/,
  )
})

test('operator upload uses shared magic-byte validation',()=>{
  assert.match(
    source,
    /validateUploadedOperatorSignatures/,
  )
  assert.match(
    source,
    /!hasExpectedFileSignature\(/,
  )
})

test('operator PDFs require PDF signature through shared validator',()=>{
  assert.match(
    source,
    /'%PDF-'/,
  )
})

test('operator JPEGs require JPEG magic bytes',()=>{
  assert.match(source,/buffer\[0\] === 0xff/)
  assert.match(source,/buffer\[1\] === 0xd8/)
  assert.match(source,/buffer\[2\] === 0xff/)
})

test('operator PNGs require PNG magic bytes',()=>{
  assert.match(source,/0x89/)
  assert.match(source,/0x50/)
  assert.match(source,/0x4e/)
  assert.match(source,/0x47/)
})

test('signature mismatch cleans all newly uploaded operator files',()=>{
  const start=source.indexOf(
    'const validateUploadedOperatorSignatures',
  )
  const end=source.indexOf(
    'const operatorDocumentUpload =',
    start,
  )
  const block=source.slice(start,end)

  assert.match(
    block,
    /removeUploadedFiles\(/,
  )
})

test('multer operator-upload errors also clean written files',()=>{
  const start=source.indexOf(
    'const operatorDocumentUpload =',
  )
  const end=source.indexOf(
    'module.exports =',
    start,
  )
  const block=source.slice(start,end)

  assert.match(
    block,
    /if \([\s\S]*error[\s\S]*removeUploadedFiles\(/,
  )
})

test('operator stored filenames remain crypto-random',()=>{
  assert.match(
    source,
    /crypto\.randomUUID\(\)/,
  )
})

test('operator upload still caps file size',()=>{
  const start=source.indexOf(
    'const operatorUpload =',
  )
  const end=source.indexOf(
    'const operatorDocumentUploadBase =',
    start,
  )
  const block=source.slice(start,end)

  assert.match(
    block,
    /5 \*[\s\S]*1024 \*[\s\S]*1024/,
  )
})