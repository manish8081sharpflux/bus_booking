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

const functionBlock=(startMarker,endMarker)=>{
  const start=source.indexOf(startMarker)
  const end=source.indexOf(endMarker,start)

  assert.ok(
    start>=0 && end>start,
    `${startMarker} boundaries missing`,
  )

  return source.slice(start,end)
}

test('controller cleanup only walks current request files',()=>{
  assert.match(
    source,
    /Object[\s\S]*\.values\([\s\S]*req\?\.files \|\| \{\}/,
  )
})

test('controller cleanup removes uploaded files from disk',()=>{
  assert.match(
    source,
    /fs\.existsSync\(/,
  )
  assert.match(
    source,
    /fs\.unlinkSync\(/,
  )
})

test('cleanup is best effort and preserves original error',()=>{
  const helper=functionBlock(
    'const cleanupUploadedBusFiles =',
    'const normalizeRegistrationNumber =',
  )

  assert.match(helper,/catch \{/)
  assert.doesNotMatch(helper,/throw /)
})

test('addBus cleans uploaded files when validation or service fails',()=>{
  const block=functionBlock(
    'const addBus =',
    'const listBuses =',
  )

  const create=block.indexOf(
    'createBusWithSeats({',
  )
  const cleanup=block.lastIndexOf(
    'cleanupUploadedBusFiles(req)',
  )
  const next=block.lastIndexOf(
    'next(error)',
  )

  assert.ok(
    create>=0 &&
    cleanup>create &&
    next>cleanup,
  )
})

test('addBus success path does not clean persisted files',()=>{
  const block=functionBlock(
    'const addBus =',
    'const listBuses =',
  )

  const catchStart=block.lastIndexOf(
    'catch (error) {',
  )

  const beforeCatch=
    block.slice(0,catchStart)

  assert.doesNotMatch(
    beforeCatch,
    /cleanupUploadedBusFiles\(req\)/,
  )
})

test('renewCompliance cleans newly uploaded files on downstream failure',()=>{
  const block=functionBlock(
    'const renewCompliance = async (',
    'module.exports',
  )

  const catchStart=block.lastIndexOf(
    'catch (error) {',
  )
  const cleanup=block.indexOf(
    'cleanupUploadedBusFiles(req)',
    catchStart,
  )
  const next=block.indexOf(
    'next(error)',
    catchStart,
  )

  assert.ok(
    catchStart>=0 &&
    cleanup>catchStart &&
    next>cleanup,
  )
})

test('renewCompliance success path keeps uploaded files',()=>{
  const block=functionBlock(
    'const renewCompliance = async (',
    'module.exports',
  )

  const catchStart=block.lastIndexOf(
    'catch (error) {',
  )

  const beforeCatch=
    block.slice(0,catchStart)

  assert.doesNotMatch(
    beforeCatch,
    /cleanupUploadedBusFiles\(req\)/,
  )
})

test('cleanup does not delete arbitrary paths outside req.files',()=>{
  const helper=functionBlock(
    'const cleanupUploadedBusFiles =',
    'const normalizeRegistrationNumber =',
  )

  assert.match(
    helper,
    /getRequestUploadedBusFiles\([\s\S]*req/,
  )
  assert.doesNotMatch(
    helper,
    /readdirSync|rmSync|rmdirSync/,
  )
})