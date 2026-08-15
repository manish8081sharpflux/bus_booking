const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const source = fs.readFileSync(
  path.join(
    __dirname,
    '../src/services/bus.service.js',
  ),
  'utf8',
)

const reviewStart =
  source.indexOf(
    '  reviewBus: async ({ busId, approved, reason, reviewerId }) => {',
  )

const resubmitStart =
  source.indexOf(
    '  resubmitBus: async ({ busId, operatorId }) => {',
    reviewStart,
  )

assert.ok(
  reviewStart >= 0 &&
  resubmitStart > reviewStart,
  'review/resubmit export methods missing',
)

const reviewSource =
  source.slice(
    reviewStart,
    resubmitStart,
  )

const moduleEnd =
  source.indexOf(
    '\n}',
    resubmitStart,
  )

assert.ok(
  moduleEnd > resubmitStart,
  'module export end missing after resubmit',
)

const resubmitSource =
  source.slice(
    resubmitStart,
    moduleEnd,
  )

test('admin review locks the bus row transactionally', () => {
  assert.match(
    reviewSource,
    /BEGIN/,
  )

  assert.match(
    reviewSource,
    /FOR UPDATE/,
  )

  assert.match(
    reviewSource,
    /COMMIT/,
  )

  assert.match(
    reviewSource,
    /ROLLBACK/,
  )
})

test('admin review only accepts pending approval buses', () => {
  assert.match(
    reviewSource,
    /approval_status !== 'PENDING_APPROVAL'/,
  )

  assert.match(
    reviewSource,
    /Only buses pending verification can be reviewed\./,
  )
})

test('approval never auto-activates the bus', () => {
  assert.match(
    reviewSource,
    /approved \? 'INACTIVE' : 'REJECTED'/,
  )

  assert.match(
    reviewSource,
    /approval_status = \$5/,
  )

  assert.match(
    reviewSource,
    /operational_status = 'INACTIVE'/,
  )

  assert.doesNotMatch(
    reviewSource,
    /operational_status\s*=\s*'ACTIVE'/,
  )
})

test('review persists safe approved or rejected approval state', () => {
  assert.match(
    reviewSource,
    /approved \? 'APPROVED' : 'REJECTED'/,
  )

  assert.match(
    reviewSource,
    /approved \? null : String\(reason\)\.trim\(\)/,
  )
})

test('resubmit locks the operator-owned bus row', () => {
  assert.match(
    resubmitSource,
    /BEGIN/,
  )

  assert.match(
    resubmitSource,
    /operator_id = \$2::uuid/,
  )

  assert.match(
    resubmitSource,
    /FOR UPDATE/,
  )
})

test('resubmit only accepts rejected buses', () => {
  assert.match(
    resubmitSource,
    /current\.status !== 'REJECTED'/,
  )

  assert.match(
    resubmitSource,
    /current\.approval_status !== 'REJECTED'/,
  )

  assert.match(
    resubmitSource,
    /Only rejected buses can be resubmitted\./,
  )
})

test('resubmit requires a correction after review', () => {
  assert.match(
    resubmitSource,
    /BUS_RESUBMIT_NO_CHANGES/,
  )

  assert.match(
    resubmitSource,
    /Make the required correction before resubmitting this bus\./,
  )

  assert.match(
    resubmitSource,
    /Math\.max\(busUpdatedAt, relatedUpdatedAt\) <= reviewedAt/,
  )
})

test('resubmit returns bus to pending and inactive', () => {
  assert.match(
    resubmitSource,
    /status = 'PENDING_APPROVAL'/,
  )

  assert.match(
    resubmitSource,
    /approval_status = 'PENDING_APPROVAL'/,
  )

  assert.match(
    resubmitSource,
    /operational_status = 'INACTIVE'/,
  )

  assert.match(
    resubmitSource,
    /rejection_reason = NULL/,
  )

  assert.match(
    resubmitSource,
    /reviewed_by = NULL/,
  )

  assert.match(
    resubmitSource,
    /reviewed_at = NULL/,
  )
})

test('resubmit is transactional', () => {
  assert.match(
    resubmitSource,
    /COMMIT/,
  )

  assert.match(
    resubmitSource,
    /ROLLBACK/,
  )
})