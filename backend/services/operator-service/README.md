# operator-service

This service owns operator management and keeps operator registration free by default.

## Environment

- `PORT` (default: `4600`)
- `OPERATOR_DATABASE_URL` (preferred) or `DATABASE_URL`
- `REDIS_URL` (default: `redis://localhost:6379`) for OTP state
- `SMS_ENABLED` (`false` for local dev; when `true` sends real SMS)
- `SMS_BASE_URL`, `SMS_USER`, `SMS_PASSWORD`, `SMS_SENDER_ID`, `SMS_PEID`
- `SMS_CHANNEL` (default `Trans`), `SMS_DCS` (default `0`), `SMS_FLASH_SMS` (default `0`), `SMS_ROUTE` (default `2`)
- `SMS_APP_HASH` (default `dqAB8ldvXQ=`)
- `OTP_TTL_SECONDS` (default `300`)
- `OTP_MAX_VERIFY_ATTEMPTS` (default `5`)
- `OTP_RESEND_COOLDOWN_SECONDS` (default `30`)
- `OTP_VERIFIED_WINDOW_MINUTES` (default `30`)
- `OTP_VERIFY_REQUIRED` (default `true`)

Create env file:

```bash
cp .env.example .env
```

## OTP API

- `POST /operators/send-otp`
  - body: `{ "mobile": "9876543210" }`
- `POST /operators/verify-otp`
  - body: `{ "mobile": "9876543210", "otp": "1234" }`
- `POST /operators/register`
  - requires OTP verification for the same mobile (if `OTP_VERIFY_REQUIRED=true`)

When `SMS_ENABLED=false`, OTP is not sent to a provider; it is logged in the service console for testing.

## Required DB table

```sql
CREATE TABLE IF NOT EXISTS operators (
  id BIGSERIAL PRIMARY KEY,
  operator_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT,
  address TEXT,
  registration_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_free_registration BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## How To Create A New Microservice (Future Reference)

1. Go to services folder:
   - `cd /Users/sagarhatikat/bus-booking-system/backend/services`
2. Create service and init npm:
   - `mkdir <new-service> && cd <new-service> && npm init -y`
3. Install packages:
   - `npm i express dotenv`
   - Add only what is needed: `pg` or `mongoose` or `redis` or `kafkajs`
   - `npm i -D nodemon`
4. Add scripts in service `package.json`:
   - `"dev": "nodemon src/server.js"`
   - `"start": "node src/server.js"`
5. Create standard structure:
   - `src/config/env.js`
   - `src/app.js`
   - `src/server.js`
   - `src/routes/`
   - `src/controllers/`
   - `src/services/`
   - `src/infrastructure/`
6. Build request flow:
   - `route -> controller -> service -> database`
7. Add `GET /health` endpoint in `app.js`.
8. Keep config in `.env` and read from `src/config/env.js`.
9. If using SQL, create table on bootstrap with `CREATE TABLE IF NOT EXISTS ...`.
10. Register service in `/backend/services/package.json`:
    - Add in `workspaces`
    - Add script like `"start:<name>": "npm --workspace <new-service> run dev"`
11. Wire API gateway:
    - Add `<SERVICE>_URL` in gateway env config
    - Add proxy route in gateway like `/api/<route>`
12. Run and test:
    - `npm install` in `/backend/services`
    - `npm run start:<name>`
    - Test with `curl`/Postman via gateway route.
13. Document in service README:
    - Purpose, env vars, routes, sample request, DB schema.
