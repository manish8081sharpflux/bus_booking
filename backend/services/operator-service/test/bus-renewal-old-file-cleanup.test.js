const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const source=fs.readFileSync(
  path.join(
    __dirname,
    '../src/controllers/bus.controller.js',
  ),
  'utf8',
)

test('renewal maps uploaded fields to document types',()=>{
  assert.match(source,/rcDocument: 'RC'/)
  assert.match(source,/insuranceDocument: 'INSURANCE'/)
  assert.match(source,/permitDocument: 'PERMIT'/)
  assert.match(source,/fitnessDocument: 'FITNESS'/)
  assert.match(source,/pucDocument: 'PUC'/)
})

test('renewal snapshots previous documents before service update',()=>{
  const start=source.indexOf(
    'const renewCompliance = async (',
  )
  const end=source.indexOf(
    'module.exports',
    start,
  )
  const block=source.slice(start,end)

  const previous=block.indexOf(
    'await getBusDocuments(',
  )
  const renew=block.indexOf(
    'await renewBusCompliance({',
  )

  assert.ok(
    previous>=0 &&
    renew>previous,
  )
})

test('old file cleanup runs only after renewal succeeds',()=>{
  const start=source.indexOf(
    'const renewCompliance = async (',
  )
  const end=source.indexOf(
    'module.exports',
    start,
  )
  const block=source.slice(start,end)

  const renew=block.indexOf(
    'await renewBusCompliance({',
  )
  const cleanup=block.indexOf(
    'cleanupReplacedBusDocumentFiles(',
    renew,
  )

  assert.ok(
    renew>=0 &&
    cleanup>renew,
  )
})

test('only replaced document types are deleted',()=>{
  assert.match(
    source,
    /renewedDocumentTypes\.has\([\s\S]*document\.document_type/,
  )
})

test('old cleanup is constrained to bus upload directory',()=>{
  assert.match(
    source,
    /path\.resolve\([\s\S]*process\.cwd\(\),[\s\S]*'uploads',[\s\S]*'buses'/,
  )
  assert.match(
    source,
    /candidate\.startsWith\([\s\S]*uploadsRoot/,
  )
})

test('old file removal uses unlink only',()=>{
  assert.match(
    source,
    /fs\.unlinkSync\(/,
  )
  assert.doesNotMatch(
    source,
    /rmSync|rmdirSync|readdirSync/,
  )
})

test('post-commit cleanup failure does not fail renewal',()=>{
  const start=source.indexOf(
    'const cleanupReplacedBusDocumentFiles =',
  )
  const end=source.indexOf(
    'const getRequestUploadedBusFiles =',
    start,
  )
  const block=source.slice(start,end)

  assert.match(block,/catch \{/)
  assert.doesNotMatch(block,/throw /)
})