import http from 'k6/http';
import { check } from 'k6';
export const options = { vus: 20, duration: '30s', thresholds: { http_req_duration: ['p(95)<750'] } };
const BASE = __ENV.STAGING_BASE_URL;
export default function () {
  // Requires WHATSAPP_TEST_SIGNATURE only in an isolated staging environment.
  const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
  const res = http.post(`${BASE}/api/whatsapp/webhook`, payload, { headers: { 'Content-Type': 'application/json', 'x-hub-signature-256': __ENV.WHATSAPP_TEST_SIGNATURE || 'invalid' } });
  check(res, { 'webhook fails safely or accepts valid test signature': (r) => [200, 401, 403].includes(r.status) });
}
