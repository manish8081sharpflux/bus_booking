const test = require('node:test')
const assert = require('node:assert/strict')
const { __test } = require('../src/controllers/bus.controller')
const { validateBus, validateSeats, normalizeRegistrationNumber } = __test

function validBus(overrides = {}) {
  return {
    busName: 'Shivneri Express',
    registrationNumber: 'MH12AB1234',
    busType: 'AC_SEATER',
    manufacturer: 'Tata',
    model: 'Starbus',
    manufacturingYear: 2024,
    deckType: 'SINGLE',
    totalSeats: 2,
    amenities: ['AC'],
    fuelType: 'DIESEL',
    ownershipType: 'OWNED',
    acType: 'AC',
    seatingType: 'SEATER',
    seatLayout: '2X2',
    busCategory: 'STANDARD',
    axleType: 'SINGLE_AXLE',
    transmissionType: 'MANUAL',
    suspensionType: 'AIR',
    serviceType: 'INTERCITY',
    ...overrides,
  }
}
function seat(number, row, column, overrides = {}) {
  return { seatNumber:number, deck:1, row, column, seatType:'SEATER', ...overrides }
}

test('registration normalization', () => {
  assert.equal(normalizeRegistrationNumber(' mh 12 ab 1234 '), 'MH12AB1234')
})
test('consistent AC seater passes', () => {
  assert.deepEqual(validateBus(validBus()).errors, {})
})
test('AC type mismatch rejected', () => {
  assert.ok(validateBus(validBus({acType:'NON_AC'})).errors.acType)
})
test('seating type mismatch rejected', () => {
  assert.ok(validateBus(validBus({busType:'AC_SLEEPER',seatingType:'SEATER',seatLayout:'2X1_SLEEPER'})).errors.seatingType)
})
test('duplicate physical positions rejected', () => {
  const r=validateSeats([seat('1A',1,1),seat('1B',1,1)],2,'SINGLE','SEATER','2X2')
  assert.ok(r.errors.some(x=>x.includes('positions must be unique')))
})
test('sleeper berth level required', () => {
  const r=validateSeats([seat('L1',1,1,{seatType:'SLEEPER'})],1,'SINGLE','SLEEPER','2X1_SLEEPER')
  assert.ok(r.errors.some(x=>x.includes('berth level')))
})
test('double deck must have both decks', () => {
  const r=validateSeats([seat('1A',1,1),seat('1B',1,2)],2,'DOUBLE','SEATER','2X2')
  assert.ok(r.errors.some(x=>x.includes('both lower and upper decks')))
})
test('layout width enforced', () => {
  const r=validateSeats([seat('1A',1,5)],1,'SINGLE','SEATER','2X2')
  assert.ok(r.errors.some(x=>x.includes('layout width')))
})