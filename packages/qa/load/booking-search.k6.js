import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = { stages: [{ duration: '20s', target: 20 }, { duration: '40s', target: 100 }, { duration: '20s', target: 0 }], thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<1000'] } };
const BASE = __ENV.STAGING_BASE_URL;
export default function () {
  const date = __ENV.TRAVEL_DATE || '2026-08-20';
  const res = http.get(`${BASE}/api/bookings/trips/search?source=Pune&destination=Mumbai&date=${date}`);
  check(res, { 'search returns success': (r) => r.status === 200 });
  sleep(0.5);
}
