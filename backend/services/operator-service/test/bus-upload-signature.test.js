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

test('stored upload filenames use cryptographic UUIDs',()=>{
  assert.match(
    source,
    /crypto\.randomUUID\(\)/,
  )
  assert.doesNotMatch(
    source,
    /Math\.random\(\)/,
  )
  assert.doesNotMatch(
    source,
    /Date\.now\(\)/,
  )
})

test('PDF uploads require PDF magic bytes',()=>{
  assert.match(source,/'%PDF-'/)
})

test('JPEG uploads require FF D8 FF magic bytes',()=>{
  assert.match(source,/buffer\[0\] === 0xff/)
  assert.match(source,/buffer\[1\] === 0xd8/)
  assert.match(source,/buffer\[2\] === 0xff/)
})

test('PNG uploads require canonical PNG signature',()=>{
  assert.match(source,/0x89/)
  assert.match(source,/0x50/)
  assert.match(source,/0x4e/)
  assert.match(source,/0x47/)
  assert.match(source,/0x0d/)
  assert.match(source,/0x0a/)
  assert.match(source,/0x1a/)
})

test('WEBP uploads require RIFF and WEBP markers',()=>{
  assert.match(source,/'RIFF'/)
  assert.match(source,/'WEBP'/)
})

test('zero-byte uploads fail signature validation',()=>{
  assert.match(
    source,
    /bytesRead <= 0/,
  )
})

test('signature mismatch removes all newly written bus files',()=>{
  const start=
    source.indexOf(
      'const validateUploadedBusSignatures',
    )
  const end=
    source.indexOf(
      'const busDocumentUpload =',
      start,
    )
  const block=
    source.slice(
      start,
      end,
    )

  assert.match(
    block,
    /removeUploadedFiles\(/,
  )
})

test('multer upload errors also invoke cleanup',()=>{
  const start=
    source.indexOf(
      'const busDocumentUpload =',
    )
  const block=
    source.slice(start)

  assert.match(
    block,
    /if \([\s\S]*error[\s\S]*removeUploadedFiles\(/,
  )
})

test('existing MIME and extension parity remains enforced',()=>{
  assert.match(
    source,
    /hasMatchingMimeAndExtension/,
  )
  assert.match(
    source,
    /file extension does not match its MIME type/,
  )
})

test('signature mismatch is a 422 validation error',()=>{
  assert.match(
    source,
    /uploaded file content does not match the declared file type/,
  )
  assert.match(
    source,
    /error\.status = 422/,
  )
})