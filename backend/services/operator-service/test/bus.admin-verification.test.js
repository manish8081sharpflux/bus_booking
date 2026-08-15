const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const service = fs.readFileSync(
  path.join(__dirname, '../src/services/bus.service.js'),
  'utf8',
)
const admin = fs.readFileSync(
  path.join(
    __dirname,
    '../../../../admin-panel/src/pages/bus-verification-page.tsx',
  ),
  'utf8',
)

test('admin approval no longer auto-activates bus', () => {
  assert.match(
    service,
    /const status = approved \? 'INACTIVE' : 'REJECTED'/,
  )
  assert.match(
    service,
    /operational_status = 'INACTIVE'/,
  )
})

test('admin approval checks compliance expiry', () => {
  assert.match(service, /BUS_COMPLIANCE_EXPIRED/)
  assert.match(service, /insurance_expiry/)
  assert.match(service, /permit_expiry/)
  assert.match(service, /fitness_expiry/)
})

test('admin approval requires core documents', () => {
  assert.match(service, /BUS_REQUIRED_DOCUMENTS_MISSING/)
  assert.match(service, /'RC'/)
  assert.match(service, /'INSURANCE'/)
  assert.match(service, /'PERMIT'/)
  assert.match(service, /'FITNESS'/)
})

test('approval still verifies compliance and documents', () => {
  assert.match(
    service,
    /UPDATE bus_compliance SET verification_status = \$2/,
  )
  assert.match(
    service,
    /UPDATE bus_documents SET verification_status = \$2/,
  )
})

test('admin UI does not promise automatic activation', () => {
  assert.doesNotMatch(admin, /Approve & activate/)
  assert.match(admin, /Approve bus/)
  assert.match(admin, /kept inactive/)
})