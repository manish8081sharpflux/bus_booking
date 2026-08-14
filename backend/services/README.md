# Microservices Scaffold

This folder contains the target microservice architecture for the bus booking system.

## Services
- `api-gateway`: Entrypoint for frontend/mobile, request routing, auth pass-through.
- `auth-service`: User auth and identity (MongoDB).
- `booking-service`: Booking lifecycle and seat reservation (PostgreSQL).
- `operator-service`: Operator registration and operator management (PostgreSQL, free registration).
- `search-service`: Search/read model service (MongoDB, projection consumer).
- `tracking-service`: Live trip/location state (Redis).
- `consumers`: Kafka consumers for projection sync and notifications.

## Suggested Infra
- MongoDB
- PostgreSQL
- Redis
- Kafka (+ Zookeeper if needed)

## Migration Strategy
1. Keep existing `backend/src` monolith live.
2. Implement each route/domain in corresponding service.
3. Move frontend traffic to `api-gateway`.
4. Decommission monolith routes after parity.

## Service Ports (default)
- API Gateway: `4000`
- Auth Service: `4100`
- Booking Service: `4200`
- Operator Service: `4600`
- Search Service: `4300`
- Tracking Service: `4400`
- Consumers (worker): `4500`

## Learning Mode (Run + Understand)
Use this sequence when you want to understand how requests and events move in the system.

1. Start gateway and auth service:
   - `npm run start:gateway`
   - `npm run start:auth`
2. Open architecture map from gateway:
   - `curl http://localhost:4000/learn/architecture`
3. Test synchronous request flow (gateway -> auth-service):
   - `curl -X POST http://localhost:4000/api/auth/register -H 'Content-Type: application/json' -d '{"name":"A","email":"a@example.com","password":"123456"}'`
4. Add booking/search/consumers and observe asynchronous flow:
   - booking-service writes booking to Postgres
   - booking-service publishes `booking.events` to Kafka
   - search-service consumer updates Mongo read model
   - consumers worker processes background tasks

Think in two paths:
- Sync path: client waits for immediate response.
- Async path: services communicate through Kafka events in background.




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



## Docker Learning Mode (Step by Step)
Use this when you want one reproducible setup for all services + infra.

### 1. Why this setup
- One command to run MongoDB, PostgreSQL, Redis, Kafka, and all backend services.
- Same runtime everywhere (your machine, teammate machine, CI/server).
- No local dependency/version mismatch.

### 2. Files added
- `backend/services/Dockerfile`: shared image for all Node services.
- `backend/services/docker-compose.yml`: infra + service orchestration.
- `backend/services/.dockerignore`: smaller/faster builds.

### 3. Start everything
From `backend/services`:

```bash
docker compose up --build
```

### 4. Verify services are up
In another terminal:

```bash
docker compose ps
curl http://localhost:4000/learn/architecture
```

### 5. Test sync flow (gateway -> auth)
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"A","email":"a@example.com","password":"123456"}'
```

### 6. Test async flow (Kafka-based)
- booking-service writes to PostgreSQL and publishes `booking.events`.
- search-service and consumers process the event in background.

Watch logs:

```bash
docker compose logs -f booking-service search-service consumers
```

### 7. Stop everything
```bash
docker compose down
```

If you also want to remove DB/cache data volumes:

```bash
docker compose down -v
```

### 8. Run only infra (optional learning mode)
If you want to run Node services locally but infra in Docker:

```bash
docker compose up -d mongodb postgres redis zookeeper kafka
```

Then run services with your existing npm scripts.
