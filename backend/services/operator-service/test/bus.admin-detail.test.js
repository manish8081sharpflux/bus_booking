const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const routes = fs.readFileSync(
  path.join(__dirname, '../src/routes/bus.routes.js'),
  'utf8',
)

const controller = fs.readFileSync(
  path.join(__dirname, '../src/controllers/bus.controller.js'),
  'utf8',
)

const admin = fs.readFileSync(
  path.join(
    __dirname,
    '../../../../admin-panel/src/pages/bus-verification-page.tsx',
  ),
  'utf8',
)

test('SUPER_ADMIN verification detail route bypasses operator context', () => {
  const match = routes.match(
    /router\.get\(\s*'\/verification\/:id'[\s\S]*?getVerificationBus,\s*\)/,
  )

  assert.ok(match, 'verification detail route missing')
  assert.match(match[0], /requireRoles\('SUPER_ADMIN'\)/)
  assert.doesNotMatch(match[0], /resolveOperator/)
})

test('verification route section has no leftover fragments', () => {
  assert.doesNotMatch(routes, /\)router\./)
  assert.doesNotMatch(routes, /^,\s*resolveOperator/m)

  const routeCount = (
    routes.match(/'\/:id\/resubmit'/g) || []
  ).length

  assert.equal(routeCount, 1)

  assert.match(
    routes,
    /router\.patch\('\/:id\/resubmit', requireAuth, requireRoles\('OPERATOR_ADMIN','MANAGER'\), resolveOperator, resubmit\)/,
  )
})

test('admin verification uses dedicated admin detail endpoint', () => {
  assert.match(
    admin,
    /\/buses\/verification\/\$\{id\}/,
  )

  assert.doesNotMatch(
    admin,
    /call\(`\/buses\/\$\{id\}`\)/,
  )
})

test('verification detail returns full review information', () => {
  assert.match(controller, /getVerificationBus/)
  assert.match(controller, /getBusSeats\(bus\.id\)/)
  assert.match(controller, /getBusCompliance\(bus\.id\)/)
  assert.match(controller, /getBusDocuments\(bus\.id\)/)
  assert.match(controller, /findOperatorById\(bus\.operator_id\)/)
})

test('admin source contains no common mojibake lead characters', () => {
  assert.equal(
    admin.includes(
      String.fromCharCode(0x00c3),
    ),
    false,
  )

  assert.equal(
    admin.includes(
      String.fromCharCode(0x00c2),
    ),
    false,
  )
})

test('rejection reason is constrained before submit', () => {
  assert.match(admin, /maxLength=\{500\}/)
  assert.match(admin, /reason\.trim\(\)\.length < 5/)
  assert.match(admin, /replace\(\/\^\\s\+\//)
})