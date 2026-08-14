const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('booking service enforces immutable quote consumption with row lock', () => {
  const src = read('backend/services/booking-service/src/services/booking.service.js');
  assert.match(src, /booking_price_quotes/);
  assert.match(src, /consumed_at IS NULL/);
  assert.match(src, /FOR UPDATE/);
  assert.match(src, /fare quote has expired/i);
});

test('booking service has payment idempotency and seat finalization', () => {
  const src = read('backend/services/booking-service/src/services/booking.service.js');
  assert.match(src, /idempotency_key/);
  assert.match(src, /status='BOOKED'/);
  assert.match(src, /status='CAPTURED'/);
});

test('whatsapp uses internal service key for privileged booking operations', () => {
  const middleware = read('backend/services/booking-service/src/middlewares/internal.middleware.js');
  const api = read('backend/services/whatsapp-service/src/services/booking-api.js');
  assert.match(middleware, /INTERNAL_SERVICE_KEY/);
  assert.match(api, /INTERNAL_SERVICE_KEY/);
});
