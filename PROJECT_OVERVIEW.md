# Bus Booking System — Project Overview

## Purpose

This repository contains the foundation of a bus booking platform. It is organised as a monorepo with a customer-facing web application, a separate administration panel, and a Node.js microservices backend. The backend is designed for independent service ownership, synchronous HTTP calls through an API gateway, and asynchronous updates through Kafka.

## Repository Structure

| Path | Purpose | Current state |
| --- | --- | --- |
| `frontend/` | Ionic React/Vite customer web application | Home UI and operator registration flow are implemented. |
| `admin-panel/` | React/Vite administration interface | Authentication framework plus operator management screens are implemented. |
| `backend/services/` | Node.js microservices workspace | Gateway, six services, event consumers, and Docker Compose environment are present. |
| `mobile/` | Intended mobile application location | No source files are currently present. |

## Architecture

```text
Customer web app / Admin panel
             |
             v
      API Gateway (port 4000)
             |
  +----------+----------+----------+----------+----------+
  |          |          |          |          |          |
Auth     Booking    Operator    Search    Tracking   Consumers
MongoDB  PostgreSQL PostgreSQL  MongoDB   Redis      MongoDB
             \          |          /              /
              \--------- Kafka event topics ------/
```

The gateway proxies requests under `/api`. Booking and tracking services publish events to Kafka; the search service and background consumer worker process these events. Each HTTP service exposes a `/health` endpoint.

## Implemented Backend Services

| Service | Port | Storage | Implemented capabilities |
| --- | ---: | --- | --- |
| API gateway | `4000` | — | Proxies `/api/auth`, `/api/bookings`, `/api/operators`, `/api/search`, and `/api/tracking`; exposes `/learn/architecture`. |
| Auth | `4100` | MongoDB; PostgreSQL menu data | Registration, login, JWT-based identity lookup, role-aware menu lookup, and administrator-only user listing. Roles are `USER`, `OPERATOR`, and `ADMIN`; admin creation requires `ADMIN_CREATION_KEY`. |
| Booking | `4200` | PostgreSQL | Creates confirmed bookings and cancels bookings. Both actions publish `booking.events` Kafka messages. |
| Search | `4300` | MongoDB | Queries a trip read model by source, destination, and date. A Kafka consumer updates the projection from booking events. |
| Tracking | `4400` | Redis | Stores a trip's current location for one hour, retrieves it by trip ID, and publishes `tracking.events`. |
| Operator | `4600` | PostgreSQL; Redis | OTP send/verify flow, free operator registration, list/detail/update/delete operations, and administrator-managed approval status. |
| Consumers | `4500` | MongoDB | Background Kafka worker for booking and tracking event handling. It is not a public HTTP API. |

### Current API Routes

All routes below can be accessed through the gateway by prefixing with `http://localhost:4000/api`; the service also accepts its direct route on the service port.

| Area | Routes |
| --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /auth/menu`, `GET /auth/users` (admin) |
| Bookings | `POST /bookings`, `PATCH /bookings/:id/cancel` |
| Operators | `POST /operators/send-otp`, `POST /operators/verify-otp`, `POST /operators/register`, `GET /operators`, `GET /operators/:id`, `PATCH /operators/:id`, `PATCH /operators/:id/status`, `DELETE /operators/:id` |
| Search | `GET /search/trips?source=&destination=&date=` |
| Tracking | `POST /tracking/location`, `GET /tracking/location/:tripId` |

Protected operator list/read routes allow `ADMIN` and `OPERATOR`; update, status changes, and deletion require `ADMIN`. The auth user list also requires `ADMIN`.

## Client Applications

### Customer Web App

The `frontend/` application uses Ionic React and Vite. It currently includes:

- A styled BusGo home screen with navigation drawer and tab bar.
- Placeholder pages for bookings, offers, and profile.
- An operator registration page at `/register-bus`.
- OTP-based mobile verification before operator registration.
- Optional Google reCAPTCHA Enterprise token generation using `VITE_RECAPTCHA_SITE_KEY`.

The registration UI calls the operator service directly by default (`http://localhost:4600`). Set `VITE_API_BASE_URL` to use another base URL, such as the gateway route.

### Admin Panel

The `admin-panel/` application is a Vite React application with theme, query, routing, and authentication providers. Project-specific work includes:

- Sign-in, sign-up, password reset, and callback route scaffolding.
- Operator list with search, view, edit, status update, and delete actions.
- Add-operator form with OTP verification.
- JWT bearer-token calls to the operator API.
- Role-based backend authorization for users and operators.

The admin operator client defaults to `http://localhost:4600`. Configure `VITE_OPERATOR_API_BASE_URL` for a direct service URL or `VITE_API_GATEWAY_BASE_URL` for gateway access.

## Local Development

### Prerequisites

- Node.js and npm
- Docker Desktop for the complete containerised environment

### Backend with Docker

From `backend/services/`:

```bash
docker compose up --build
```

This starts MongoDB, PostgreSQL, Redis, Kafka, Zookeeper, the API gateway, all services, and the consumer worker. Verify the gateway with:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/learn/architecture
```

### Backend Services Locally

From `backend/services/`, install dependencies and start individual services:

```bash
npm install
npm run start:gateway
npm run start:auth
```

Additional scripts are available for booking, operator, search, tracking, consumers, and `start:all`. Local services require MongoDB, PostgreSQL, Redis, and Kafka connection variables; Docker Compose can run only that infrastructure if preferred.

### Frontend and Admin Panel

```bash
cd frontend
npm install
npm run dev

cd ../admin-panel
npm install
npm run dev
```

## Configuration Notes

- `JWT_SECRET` must be set for auth and operator authorization outside the supplied Docker development defaults.
- `ADMIN_CREATION_KEY` is required before creating `ADMIN` users through the auth API.
- Operator OTP behaviour is configured with `OTP_VERIFY_REQUIRED`, Redis settings, TTL, retry, and SMS environment variables. With `SMS_ENABLED=false`, OTPs are logged for development.
- Configure gateway CORS through `ALLOWED_ORIGINS` when client origins differ from the defaults.
- The frontend can generate a reCAPTCHA token, but this repository currently contains no backend validation of that token.

## Delivery Status and Next Work

The repository has a working architectural scaffold and several domain workflows, especially operator onboarding and management. The following areas are not yet complete end-to-end:

- Customer authentication and booking screens are not connected to the backend.
- Trip/operator inventory creation and seat availability management are not implemented; booking accepts a supplied `tripId` and number of seats.
- Search has a read-model query endpoint, but no complete trip creation/publication workflow is present.
- Tracking stores and returns locations but does not provide a live map, websocket stream, or device integration.
- Payment, ticket generation, notifications, refunds, reporting, and production deployment/observability are not implemented.
- Automated application tests are not configured at the repository root.
- The intended `mobile/` app has not yet been created.

## Useful Entry Points

- `README` — concise original project summary.
- `backend/services/README.md` — microservice and Docker learning notes.
- `backend/services/docker-compose.yml` — local container topology and development defaults.
- `frontend/src/pages/RegisterBusPage.tsx` — customer operator-registration implementation.
- `admin-panel/src/pages/account/members/operators/` — administration operator-management implementation.
