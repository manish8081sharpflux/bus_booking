const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('customer booking management routes require authentication', () => {
  const lines = read('backend/services/booking-service/src/routes/booking.routes.js').split('\n');
  for (const marker of ["router.get('/:id/cancellation-quote'", "router.post('/:id/reschedule/quote'", "router.post('/:id/payment/order'", "router.post('/:id/payment/verify'", "router.patch('/:id/cancel'"]) {
    const line = lines.find((x) => x.includes(marker));
    assert.ok(line, `missing ${marker}`);
    assert.match(line, /requireAuth/, `${marker} must use requireAuth`);
  }
});

test('WhatsApp service verifies Meta signatures using configured app secret', () => {
  const app = read('backend/services/whatsapp-service/src/app.js');
  const meta = read('backend/services/whatsapp-service/src/services/meta.js');
  assert.match(app, /x-hub-signature-256/i);
  assert.match(app, /verifySignature/);
  assert.match(meta, /WHATSAPP_APP_SECRET/);
  assert.match(meta, /timingSafeEqual|createHmac/);
});

test('production environment layer contains JWT and CORS hardening', () => {
  const candidates = [
    'backend/services/shared/config/production-env.js',
    'backend/services/shared/config/env.js',
    'backend/services/shared/middleware/productionSecurity.js',
    'scripts/production-check.js',
  ].filter((p) => fs.existsSync(path.join(root, p))).map(read).join('\n');
  assert.match(candidates, /JWT_SECRET/);
  const envFiles = fs.readdirSync(path.join(root, 'backend/services/shared'), { recursive: true }).filter((x) => typeof x === 'string' && /\.js$/.test(x));
  const shared = envFiles.map((x) => read(path.join('backend/services/shared', x))).join('\n');
  assert.match(shared + candidates, /CORS|allowedOrigins|origin/i);
});
