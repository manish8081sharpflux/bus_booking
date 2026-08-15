const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/services/booking.service.js',
  ),
  'utf8',
)

test('customer bookability requires active approved bus', () => {
  assert.match(source, /b\.status = 'ACTIVE'/)
  assert.match(source, /b\.operational_status = 'ACTIVE'/)
  assert.match(source, /b\.approval_status = 'APPROVED'/)
})

test('customer bookability requires verified unexpired compliance', () => {
  assert.match(source, /bc\.verification_status = 'VERIFIED'/)
  assert.match(source, /bc\.insurance_expiry >= CURRENT_DATE/)
  assert.match(source, /bc\.permit_expiry >= CURRENT_DATE/)
  assert.match(source, /bc\.fitness_expiry >= CURRENT_DATE/)
  assert.match(source, /bc\.puc_expiry IS NULL/)
  assert.match(source, /bc\.puc_expiry >= CURRENT_DATE/)
})

test('customer bookability requires verified uploaded documents', () => {
  assert.match(
    source,
    /EXISTS \(\s*SELECT 1\s*FROM bus_documents bd/s,
  )

  assert.match(
    source,
    /NOT EXISTS \(\s*SELECT 1\s*FROM bus_documents bd[\s\S]*bd\.verification_status <> 'VERIFIED'/,
  )
})

test('search seat map and quote all use runtime guard', () => {
  const matches =
    source.match(
      /\$\{customerBookabilityWhere\('b'\)\}/g,
    ) || []

  assert.equal(
    matches.length,
    3,
  )
})

test('pricingQuote joins buses before enforcing runtime guard', () => {
  const start =
    source.indexOf(
      'async pricingQuote(',
    )

  assert.ok(start >= 0)

  const block =
    source.slice(
      start,
      source.indexOf(
        '\n  async ',
        start + 10,
      ) > start
        ? source.indexOf(
            '\n  async ',
            start + 10,
          )
        : source.length,
    )

  assert.match(
    block,
    /JOIN buses b ON b\.id=t\.bus_id/,
  )

  assert.match(
    block,
    /\$\{customerBookabilityWhere\('b'\)\}/,
  )
})