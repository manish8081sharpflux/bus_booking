const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const serviceSource = fs.readFileSync(
  path.join(__dirname, '../src/services/bus.service.js'),
  'utf8',
)
const controllerSource = fs.readFileSync(
  path.join(__dirname, '../src/controllers/bus.controller.js'),
  'utf8',
)
const routeSource = fs.readFileSync(
  path.join(__dirname, '../src/routes/bus.routes.js'),
  'utf8',
)

test('bus details edit endpoint is authenticated and operator-scoped', () => {
  assert.match(routeSource, /\/:id\/details/)
  assert.match(routeSource, /editBusDetails/)
  assert.match(routeSource, /resolveOperator/)
})

test('structural edits require inactive bus', () => {
  assert.match(
    serviceSource,
    /BUS_MUST_BE_INACTIVE_FOR_EDIT/,
  )
  assert.match(
    serviceSource,
    /Deactivate this bus before changing/,
  )
})

test('structural edits protect active trips', () => {
  assert.match(
    serviceSource,
    /BUS_HAS_ACTIVE_TRIPS/,
  )
  assert.match(
    serviceSource,
    /getBlockingTripsForBus/,
  )
})

test('registration uniqueness excludes current bus', () => {
  assert.match(
    serviceSource,
    /registration_number = \$1[\s\S]*id <> \$2::uuid/,
  )
  assert.match(
    serviceSource,
    /DUPLICATE_REGISTRATION/,
  )
})

test('review-sensitive edits reset approval and operational state', () => {
  assert.match(
    serviceSource,
    /PENDING_APPROVAL/,
  )
  assert.match(
    serviceSource,
    /operationalStatus =[\s\S]*'INACTIVE'/,
  )
})

test('edit controller reuses canonical bus validation', () => {
  assert.match(
    controllerSource,
    /validateBus\(/,
  )
  assert.match(
    controllerSource,
    /Please correct the highlighted bus details/,
  )
})