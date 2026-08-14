const assert = require('node:assert/strict');

const base = process.env.STAGING_BASE_URL;
if (!base) {
  console.log('STAGING_BASE_URL not set; staging smoke test skipped. CI can enable this after staging deployment.');
  process.exit(0);
}

const origin = base.replace(/\/$/, '');
async function check(path, expected = [200]) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${origin}${path}`, { signal: controller.signal });
    assert.ok(expected.includes(response.status), `${path} returned ${response.status}`);
    return response;
  } finally { clearTimeout(timer); }
}

(async () => {
  await check('/health', [200, 204]);
  // A protected endpoint must not anonymously disclose customer data.
  await check('/api/bookings/customer', [401, 403, 404]);
  console.log('BusGo staging smoke checks passed.');
})().catch((error) => { console.error(error); process.exit(1); });
