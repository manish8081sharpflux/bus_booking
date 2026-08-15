const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const serviceSource = fs.readFileSync(
  path.join(__dirname, '../src/services/bus.service.js'),
  'utf8',
)

const routeSource = fs.readFileSync(
  path.join(__dirname, '../src/routes/bus.routes.js'),
  'utf8',
)

const controllerSource = fs.readFileSync(
  path.join(__dirname, '../src/controllers/bus.controller.js'),
  'utf8',
)

const bookingSource = fs.readFileSync(
  path.join(
    __dirname,
    '../../booking-service/src/services/booking.service.js',
  ),
  'utf8',
)

test('customer trip search filters inactive buses', () => {
  assert.match(
    bookingSource,
    /WHERE t\.status='SCHEDULED' AND \$\{customerBookabilityWhere\('b'\)\}/,
  )
})

test('seat map also filters inactive buses', () => {
  assert.match(
    bookingSource,
    /t\.status='SCHEDULED' AND \$\{customerBookabilityWhere\('b'\)\}/,
  )
})

test('operational status route requires auth and operator resolution', () => {
  assert.match(
    routeSource,
    /\/:id\/operational-status/,
  )
  assert.match(
    routeSource,
    /changeOperationalStatus/,
  )
  assert.match(
    routeSource,
    /resolveOperator/,
  )
})

test('deactivation protects scheduled and running trips', () => {
  assert.match(
    serviceSource,
    /status IN \('SCHEDULED', 'BOARDING', 'IN_PROGRESS'\)/,
  )
  assert.match(
    serviceSource,
    /BUS_HAS_ACTIVE_TRIPS/,
  )
})

test('activation requires approved bus and verified compliance', () => {
  assert.match(
    serviceSource,
    /approval_status !== 'APPROVED'/,
  )
  assert.match(
    serviceSource,
    /verification_status !== 'VERIFIED'/,
  )
})

test('controller accepts only ACTIVE or INACTIVE', () => {
  assert.match(
    controllerSource,
    /\['ACTIVE', 'INACTIVE'\]/,
  )
})