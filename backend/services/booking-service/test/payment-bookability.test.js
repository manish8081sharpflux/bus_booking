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

const methodBlock = (
  marker,
) => {
  const start =
    source.indexOf(
      marker,
    )

  assert.ok(
    start >= 0,
    `${marker} missing`,
  )

  const next =
    source.indexOf(
      '\n  async ',
      start + 20,
    )

  return source.slice(
    start,
    next > start
      ? next
      : source.length,
  )
}

test('payment helper reuses runtime bus bookability', () => {
  assert.match(
    source,
    /const assertBookingStillBookable/,
  )

  assert.match(
    source,
    /\$\{customerBookabilityWhere\('b'\)\}/,
  )

  assert.match(
    source,
    /FOR SHARE OF t, b/,
  )
})

test('completePayment checks eligibility before capture', () => {
  const block =
    methodBlock(
      'async completePayment(',
    )

  const guard =
    block.indexOf(
      'assertBookingStillBookable(',
    )

  const capture =
    block.indexOf(
      'INSERT INTO payments',
    )

  assert.ok(
    guard >= 0 &&
    capture > guard,
  )
})

test('provider verify checks eligibility before signature capture', () => {
  const block =
    methodBlock(
      'async verifyAndCompletePayment(',
    )

  const guard =
    block.indexOf(
      'assertBookingStillBookable(',
    )

  const signature =
    block.indexOf(
      'verifyPaymentSignature',
    )

  const capture =
    block.indexOf(
      'UPDATE payments SET',
    )

  assert.ok(guard >= 0)
  assert.ok(signature > guard)
  assert.ok(capture > signature)
})

test('WhatsApp verification checks eligibility before capture', () => {
  const block =
    methodBlock(
      'async whatsappCheckoutVerify(',
    )

  const guard =
    block.indexOf(
      'assertBookingStillBookable(',
    )

  const capture =
    block.indexOf(
      'UPDATE payments SET',
    )

  assert.ok(
    guard >= 0 &&
    capture > guard,
  )
})

test('invalid trip or bus blocks payment confirmation with conflict', () => {
  assert.match(
    source,
    /Payment cannot be confirmed\./,
  )
})