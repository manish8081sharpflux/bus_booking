const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const controller = fs.readFileSync(
  path.join(
    __dirname,
    '../src/controllers/bus.controller.js',
  ),
  'utf8',
)

const addBusStart =
  controller.indexOf(
    'const addBus =',
  )

const listBusesStart =
  controller.indexOf(
    'const listBuses =',
    addBusStart,
  )

assert.ok(
  addBusStart >= 0 &&
  listBusesStart > addBusStart,
)

const addBusSource =
  controller.slice(
    addBusStart,
    listBusesStart,
  )

test('front photo remains required', () => {
  assert.match(
    addBusSource,
    /if \(!frontPhoto\)/,
  )

  assert.match(
    addBusSource,
    /fileErrors\.frontPhoto/,
  )
})

test('side photo is required by create-bus backend', () => {
  assert.match(
    addBusSource,
    /if \(!sidePhoto\)/,
  )

  assert.match(
    addBusSource,
    /fileErrors\.sidePhoto/,
  )

  assert.match(
    addBusSource,
    /Side photo of the bus is required\./,
  )
})

test('interior photo is required by create-bus backend', () => {
  assert.match(
    addBusSource,
    /if \(!interiorPhoto\)/,
  )

  assert.match(
    addBusSource,
    /fileErrors\.interiorPhoto/,
  )

  assert.match(
    addBusSource,
    /Interior photo of the bus is required\./,
  )
})

test('all required-photo checks occur before createBusWithSeats', () => {
  const createIndex =
    addBusSource.indexOf(
      'await createBusWithSeats',
    )

  for (const marker of [
    'fileErrors.frontPhoto',
    'fileErrors.sidePhoto',
    'fileErrors.interiorPhoto',
  ]) {
    const validationIndex =
      addBusSource.indexOf(
        marker,
      )

    assert.ok(
      validationIndex >= 0 &&
      validationIndex < createIndex,
      `${marker} must be validated before persistence`,
    )
  }
})