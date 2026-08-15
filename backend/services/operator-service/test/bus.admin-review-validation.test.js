const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/controllers/bus.controller.js',
  ),
  'utf8',
)

const reviewStart =
  source.indexOf(
    'review: async (',
  )

const testExportStart =
  source.indexOf(
    '__test: { validateBus, validateSeats, normalizeRegistrationNumber }',
    reviewStart,
  )

assert.ok(
  reviewStart >= 0 &&
  testExportStart > reviewStart,
  'review handler section missing',
)

const reviewSource =
  source.slice(
    reviewStart,
    testExportStart,
  )

test('review accepts only APPROVE or REJECT', () => {
  assert.match(
    reviewSource,
    /Decision must be APPROVE or REJECT\./,
  )
})

test('reject requires meaningful backend reason', () => {
  assert.match(
    reviewSource,
    /reason\.length < 5/,
  )
  assert.match(
    reviewSource,
    /at least 5 meaningful characters/,
  )
})

test('review reason is normalized and capped', () => {
  assert.match(
    reviewSource,
    /\\u0000-\\u0008/,
  )
  assert.match(
    reviewSource,
    /\.slice\(\s*0,\s*500/s,
  )
})

test('approve cannot carry rejection reason', () => {
  assert.match(
    reviewSource,
    /A rejection reason cannot be supplied when approving a bus\./,
  )
  assert.match(
    reviewSource,
    /approved\s*\?\s*null\s*:\s*reason/s,
  )
})

test('reviewer identity remains server-auth derived', () => {
  assert.match(
    reviewSource,
    /platformUserId/,
  )
  assert.doesNotMatch(
    reviewSource,
    /req\.body\?\.reviewerId/,
  )
})

test('__test export remains available for canonical validation suite', () => {
  assert.match(
    source,
    /__test:\s*\{\s*validateBus,\s*validateSeats,\s*normalizeRegistrationNumber\s*\}/s,
  )
})