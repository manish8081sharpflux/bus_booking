const test = require('node:test');
const assert = require('node:assert/strict');
const { IdempotencyStore, signWebhook, verifyWebhook } = require('./helpers');

test('idempotency returns the first result and does not execute twice', () => {
  const store = new IdempotencyStore();
  let calls = 0;
  const first = store.execute('payment-1', () => ({ calls: ++calls }));
  const second = store.execute('payment-1', () => ({ calls: ++calls }));
  assert.deepEqual(second, first);
  assert.equal(calls, 1);
});

test('Meta-style webhook signature validation rejects tampering', () => {
  const secret = 'test-secret';
  const body = JSON.stringify({ id: 'wamid.123', text: 'BOOK' });
  const signature = signWebhook(secret, body);
  assert.equal(verifyWebhook(secret, body, signature), true);
  assert.equal(verifyWebhook(secret, `${body}x`, signature), false);
});
