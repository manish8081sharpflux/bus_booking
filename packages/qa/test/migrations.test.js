const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../../../backend/services/database/postgres');

test('SQL migrations are unique and sequential through current phase', () => {
  const files = fs.readdirSync(dir).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
  const nums = files.map((f) => Number(f.slice(0, 3)));
  assert.equal(new Set(nums).size, nums.length, 'duplicate migration number found');
  for (let i = 1; i <= Math.max(...nums); i++) assert.ok(nums.includes(i), `migration ${String(i).padStart(3,'0')} missing`);
  assert.ok(nums.includes(25), 'WhatsApp completion migration 025 is required');
});

test('no temporary SQL migration files remain', () => {
  const temp = fs.readdirSync(dir).filter((f) => /\.tmp$|\.bak$|\.old$/.test(f));
  assert.deepEqual(temp, []);
});
