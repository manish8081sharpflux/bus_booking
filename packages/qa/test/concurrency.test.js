const test = require('node:test');
const assert = require('node:assert/strict');
const { SeatInventory } = require('./helpers');

test('100 concurrent attempts for one seat produce one winner', async () => {
  const inventory = new SeatInventory(['12']);
  const attempts = Array.from({ length: 100 }, (_, i) => inventory.hold('12', `B${i}`));
  const results = await Promise.all(attempts);
  assert.equal(results.filter(Boolean).length, 1);
});

test('different seats can each be held once', async () => {
  const inventory = new SeatInventory(['1', '2', '3']);
  const results = await Promise.all([
    inventory.hold('1', 'A'), inventory.hold('1', 'B'),
    inventory.hold('2', 'C'), inventory.hold('2', 'D'),
    inventory.hold('3', 'E'), inventory.hold('3', 'F'),
  ]);
  assert.equal(results.filter(Boolean).length, 3);
});
