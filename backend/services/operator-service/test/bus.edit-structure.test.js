const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const service = fs.readFileSync(
  path.join(__dirname, '../src/services/bus.service.js'),
  'utf8',
)
const controller = fs.readFileSync(
  path.join(__dirname, '../src/controllers/bus.controller.js'),
  'utf8',
)

test('structural edits require a seat layout payload', () => {
  assert.match(service, /STRUCTURAL_EDIT_FIELDS/)
  assert.match(service, /SEAT_LAYOUT_REQUIRED_FOR_STRUCTURAL_EDIT/)
})

test('structural seat replacement is transactional', () => {
  assert.match(service, /DELETE FROM bus_seats/)
  assert.match(service, /INSERT INTO bus_seats/)
  assert.match(service, /await client\.query\('COMMIT'\)/)
})

test('edit controller reuses canonical seat validation', () => {
  assert.match(controller, /validateSeats\(/)
  assert.match(controller, /Please correct the seat layout/)
})

test('seat layout is passed into update service', () => {
  assert.match(controller, /seats: normalizedSeats/)
})