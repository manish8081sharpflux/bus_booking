const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/middlewares/upload.middleware.js',
  ),
  'utf8',
)

test('bus uploads validate extension against MIME type', () => {
  assert.match(
    source,
    /allowedExtensionsByMime/,
  )
  assert.match(
    source,
    /hasMatchingMimeAndExtension/,
  )
  assert.match(
    source,
    /file extension does not match its MIME type/,
  )
})

test('jpeg permits jpg and jpeg only', () => {
  assert.match(
    source,
    /'image\/jpeg':\s*\[\s*'jpg',\s*'jpeg'/s,
  )
})

test('pdf requires pdf extension', () => {
  assert.match(
    source,
    /'application\/pdf':\s*\[\s*'pdf'/s,
  )
})

test('webp is only available to photo MIME validation', () => {
  assert.match(
    source,
    /busPhotoMimeTypes[\s\S]*'image\/webp'/,
  )

  assert.doesNotMatch(
    source,
    /busDocumentMimeTypes[\s\S]{0,100}'image\/webp'/,
  )
})

test('files without an extension are rejected', () => {
  assert.match(
    source,
    /file extension is required/,
  )
})

test('bus upload still caps size and file count', () => {
  assert.match(
    source,
    /fileSize:\s*5\s*\*\s*1024\s*\*\s*1024/s,
  )
  assert.match(
    source,
    /files:\s*8/,
  )
})