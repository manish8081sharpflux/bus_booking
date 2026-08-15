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

const start =
  source.indexOf(
    'const validateCompliance =',
  )

const end =
  source.indexOf(
    ' * FILE HELPER',
    start,
  )

assert.ok(
  start >= 0 &&
  end > start,
)

const section =
  source.slice(
    start,
    end,
  )

test('strict date shape is enforced', () => {
  assert.match(
    section,
    /\\d\{4\}-\\d\{2\}-\\d\{2\}/,
  )
  assert.match(
    section,
    /getUTCFullYear/,
  )
  assert.match(
    section,
    /getUTCMonth/,
  )
  assert.match(
    section,
    /getUTCDate/,
  )
})

test('registration date cannot be future', () => {
  assert.match(
    section,
    /Registration date cannot be in the future\./,
  )
  assert.match(
    section,
    /parsedRegistration\.getTime\(\)/,
  )
})

test('expiry dates cannot be past', () => {
  assert.match(
    section,
    /cannot be in the past\./,
  )

  for (const field of [
    'insuranceExpiry',
    'permitExpiry',
    'fitnessExpiry',
    'pucExpiry',
  ]) {
    assert.ok(
      section.includes(
        `'${field}'`,
      ),
    )
  }
})

test('document numbers enforce safe structure', () => {
  assert.match(
    section,
    /documentNumberPattern/,
  )
  assert.match(
    section,
    /invalid characters or separators/,
  )
  assert.match(
    section,
    /\[A-Z0-9\]/,
  )
})

test('PUC number and expiry stay paired', () => {
  assert.match(
    section,
    /PUC expiry date is required when a PUC number is provided\./,
  )
  assert.match(
    section,
    /PUC number is required when a PUC expiry date is provided\./,
  )
})