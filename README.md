# logistics-user-service

Profile + address service for the AI Logistics Platform. Owns customer and driver profile data, address CRUD, and the driver availability toggle that gates dispatch.

**Phase:** 2
**Spec:** [`docs/superpowers/specs/2026-05-29-user-service-design.md`](../docs/superpowers/specs/2026-05-29-user-service-design.md)
**Plan:** [`docs/superpowers/plans/2026-05-29-phase-2-user-service.md`](../docs/superpowers/plans/2026-05-29-phase-2-user-service.md)

## What this service does

- Provision customer + driver profiles from `auth-service` events (`user.registered`, `user.role_changed`) — fully idempotent via `processed_events` dedup table
- Profile read + update for the authenticated user (`GET /v1/users/me`, `PATCH /v1/users/me`)
- Address CRUD bound to the caller's user id (no cross-user reads, no IDOR vector)
- Default-address management (`PUT /v1/users/me/default-address`; DELETE rejects with 409 if address is the current default)
- Driver attribute update (`PATCH /v1/users/me/driver` — vehicle type + license plate; sets `profile_complete` invariant)
- Driver availability toggle (`PUT /v1/users/me/availability` — 409 if profile incomplete) that publishes `driver.availability.changed`
- Internal service-to-service lookups for dispatch-service (driver profile) and order-service (address resolution), gated by service JWT on `X-Service-Authorization`
- Synthesized GET /me for admins who have no profile row in the DB (admin identity flows from JWT, not from a DB read)
- Liveness + readiness probes (`/healthz` always-200; `/readyz` checks DB + RabbitMQ with 250ms timeouts)

## Architecture

A single Node.js microservice following **Hexagonal / Ports & Adapters** with **light Domain-Driven Design**. One of ~10 services in the platform; communication boundaries are HTTP (synchronous, via the gateway) and RabbitMQ (asynchronous, via a shared topic exchange). The composition root in `src/server.ts` is the only file that wires concrete adapters to the ports their dependents declare — every other file knows only the abstractions.

### Layer rule

Dependencies flow inward; arrows show what's allowed to `import` what.

```
       ┌───────────────┐
       │  interfaces   │   (Express controllers, middleware, Zod schemas, AMQP consumer)
       └───────┬───────┘
               │ depends on
               ▼
       ┌───────────────┐
       │  application  │   (use-cases, ports, DTOs — no framework imports)
       └───────┬───────┘
               │ depends on
               ▼
       ┌───────────────┐
       │    domain     │   (entities, value objects, domain events, errors)
       └───────▲───────┘
               │ implements ports declared in domain + application
       ┌───────┴───────┐
       │ infrastructure│   (Prisma, RabbitMQ, JWT)
       └───────────────┘
```

- **Domain layer** has **zero framework imports** — no Express, no Prisma, no Zod. Verified by `grep` across `src/domain/` (returns nothing for `express|zod|@prisma|amqplib`).
- **Application layer** depends only on `domain/`. It declares **ports** (interfaces like `EventPublisher`, `UnitOfWork`, `Clock`, `ProcessedEventRepository`) that infrastructure adapters fulfil. Verified by `grep` across `src/application/` (returns nothing for `infrastructure|interfaces`).
- **Infrastructure layer** imports concrete libraries and implements the ports. It's the only place where Prisma, amqplib, and jsonwebtoken are mentioned.
- **Interfaces layer** orchestrates: parse → validate → call use-case → map result → respond. No business logic. The AMQP consumer is here too — it parses envelopes and delegates to use-cases.

### Folder shape

```
src/
├── domain/                                # PURE — no framework imports
│   ├── shared/                            #   value objects (Phone, Country, Coordinates),
│   │                                      #     branded IDs (UserId, AddressId),
│   │                                      #     DomainError + 7 subclasses
│   │                                      #     (ProfileNotFoundError, AddressNotFoundError,
│   │                                      #      DriverProfileIncompleteError, DefaultAddressInUseError,
│   │                                      #      RoleRequiredError, InvariantViolationError,
│   │                                      #      ValidationError, NotFoundError)
│   ├── customer/                          #   CustomerProfile entity (universal identity carrier)
│   ├── driver/                            #   DriverProfile entity + VehicleType enum
│   ├── address/                           #   Address entity with lat/lng/label invariants
│   └── events/                            #   DriverAvailabilityChanged domain event
│
├── application/                           # use-cases + ports
│   ├── ports/                             #   CustomerProfileRepository, DriverProfileRepository,
│   │                                      #     AddressRepository, ProcessedEventRepository,
│   │                                      #     Clock, EventPublisher, UnitOfWork
│   ├── profiles/                          #   GetMyProfile (admin-synthesized path),
│   │                                      #     UpdateMyProfile, UpdateDriverProfile,
│   │                                      #     SetAvailability (publishes the event)
│   ├── addresses/                         #   List, Create (UUID v7 generator), Update, Delete
│   │                                      #     (rejects when default), SetDefault
│   ├── internal/                          #   GetDriverForService, GetAddressForService
│   │                                      #     (service-JWT-only consumers)
│   └── events/                            #   HandleUserRegistered, HandleUserRoleChanged
│                                          #     (idempotent via processed_events table)
│
├── infrastructure/                        # adapters — implements ports from domain + application
│   ├── persistence/                       #   Prisma repos (×4) + mappers (×3) + per-call factory
│   │                                      #     PrismaUnitOfWork wrapping prisma.$transaction
│   ├── messaging/                         #   RabbitMQ connection helper + publisher
│   ├── clock/                             #   SystemClock
│   ├── auth/                              #   UserJwtVerifier (HS256, USER_JWT_SECRET),
│   │                                      #     ServiceJwtVerifier (HS256, USER_SERVICE_JWT_SECRET,
│   │                                      #     audience "user-service")
│   └── logger.ts                          #   pino factory with header redaction
│
├── interfaces/
│   ├── http/
│   │   ├── controllers/                   #   profile, address, driver, internal, health
│   │   ├── middleware/                    #   request-id (UUID v7), user-auth, service-auth,
│   │   │                                  #     role-guard (requireRole / rejectRole),
│   │   │                                  #     error-mapper (RFC 7807)
│   │   ├── schemas.ts                     #   Zod request body/param validation
│   │   ├── routes.ts                      #   route table — internal subtree mounted BEFORE
│   │   │                                  #     public to avoid prefix-match shadowing
│   │   ├── response-mappers.ts            #   domain → DTO
│   │   └── express-augment.d.ts           #   adds requestId? userId? role? serviceCaller? to Request
│   └── events/
│       └── user-events-consumer.ts        #   AMQP consumer for user.registered + user.role_changed
│                                          #     with 3-retry + DLQ
│
├── config/                                # env loading (Zod-validated, boot-time fail-fast)
│                                          #   with secret-distinctness .refine
└── server.ts                              # COMPOSITION ROOT — wires 22 components together
```

### Patterns in use (and why)

| Pattern | Where | Why |
|---|---|---|
| **Hexagonal / Ports & Adapters** | `application/ports/` declared; `infrastructure/*` implements | swap adapters per environment (real Prisma in prod, in-memory fake in unit tests) without touching business logic |
| **Light DDD** | `domain/` entities + value objects with rich behavior | `setAvailable(true)` throws `DriverProfileIncompleteError` when profile is incomplete; impossible to hold an invalid entity |
| **Customer-base schema model** | `customer_profiles` row exists for customers + drivers; `driver_profiles` is a thin extension row | DRY: `displayName + phone + addresses` are universal — duplicating them per-role would duplicate the concept. Admins have **no** profile row at all; `GET /me` for admin synthesizes from JWT |
| **Repository pattern** | port in `application/ports/<aggregate>-repository.ts`; impl in `infrastructure/persistence/prisma-<aggregate>-repository.ts` | use-cases never see Prisma; integration tests can substitute an in-memory `Map`-backed fake that obeys the same contract |
| **Per-call factory Unit of Work** | `PrismaUnitOfWork.run<T>(work)` constructs per-transaction repo instances inside `prisma.$transaction()` and passes them via `TransactionalRepos` bag | explicit transactional scope at the application boundary; no ALS magic; easy to type-check |
| **Use-case / Interactor** | one file per use-case in `application/{profiles,addresses,internal,events}/`; class with `execute(input)` | each entry-point is a single class with explicit dependencies — easy to read, test, and grep for |
| **Domain events** | entities accumulate events; use-cases publish AFTER the transaction commits via the `EventPublisher` port | cross-aggregate effects flow through RabbitMQ, never through cascading FK writes |
| **Idempotency-by-design (event consumers)** | `processed_events(eventId, eventType)` table; consumer's first action is `INSERT … ON CONFLICT → return early` | duplicate AMQP delivery produces no double-write; dedup record + side effects + commit in one Prisma transaction |
| **Two-JWT verification** | `UserJwtVerifier` (HS256, `USER_JWT_SECRET`) + `ServiceJwtVerifier` (HS256, `USER_SERVICE_JWT_SECRET`, audience-pinned `"user-service"`) | defense in depth — gateway already validated, but each service re-validates independently; service JWTs use a DIFFERENT secret and a DIFFERENT header (`X-Service-Authorization`) so a forged user JWT can never escalate to a service caller and vice versa |
| **Per-route role gating** | `requireRole(["driver"])` for driver-only endpoints; `rejectRole(["admin"])` for endpoints that wouldn't make sense for admins (no admin profile row to update) | three roles (customer / driver / admin) handled at the route level, not in use-cases |
| **Internal subtree mounted BEFORE public** | `routes.ts` mounts `/v1/users/internal` ahead of `/v1/users` | Express prefix matching: if `/v1/users` were mounted first, the userAuth middleware would 401 every internal request before serviceAuth could run. Caught by integration test H17 |
| **Typed errors → RFC 7807** | `DomainError` subclasses; central middleware in `interfaces/http/middleware/error-mapper.ts` | controllers throw; middleware maps to `application/problem+json` with `type: urn:logistics:user:<code>`, `title`, `status`, `instance: <requestId>` |
| **Boot-time env validation (Fail Fast)** | `config/env.ts` uses Zod with `.refine` for cross-field secret distinctness | bad env crashes the process before the first request; `USER_JWT_SECRET === USER_SERVICE_JWT_SECRET` is rejected at boot |
| **Composition root (DI)** | `server.ts` — only file that imports concrete adapters | dependency graph visible in one place; tests build their own composition in `tests/integration/helpers/bootstrap.ts` without touching production wiring |
| **Branded types for IDs** | `UserId`, `AddressId` in `domain/shared/` | `string & { __brand: "UserId" }` prevents passing a `UserId` where an `AddressId` is expected — compile-time, no runtime cost |
| **Build-output verification early** | task B12 boots `dist/server.js --healthcheck` before any feature code is written; G7 re-verifies | catches ESM/CJS/path-alias bugs at scaffolding time, not at the end of the plan (Phase 2 gateway retro lesson #1) |

### Testing strategy

| Layer | Style | Tooling | Count |
|---|---|---|---|
| `domain/` | **Strict TDD**; pure unit tests; no mocks | Jest + ts-jest | 48 tests across 6 files |
| `application/` | **Strict TDD**; unit tests against in-memory **fakes** of every port | Jest + ts-jest + `tests/unit/fakes/*` | 60 tests across 12 use-case test files |
| `infrastructure/` | Risk-based **integration tests** | Jest + testcontainers (real Postgres + RabbitMQ) | 5 tests across 3 files (repos × 3, processed-events) + 1 publisher test |
| `interfaces/` | Risk-based; 19-test first-class integration catalog exercising the full stack | Jest + supertest + testcontainers | 23 tests across 19 files |

Totals: **119 unit + 29 integration = 148 tests**, all green at `v0.1.0`. The integration tests caught a real Express route mount-order bug (H17 / `c0d7273`) that all 119 unit tests had missed — see [`docs/superpowers/retros/2-user-service.md`](../docs/superpowers/retros/2-user-service.md).

### Cross-service touchpoints

- **HTTP in (public):** all client traffic enters via the platform gateway; user-service itself listens on `/v1/users/*` and `/healthz` / `/readyz`.
- **HTTP in (internal):** dispatch-service hits `/v1/users/internal/drivers/{userId}`; order-service hits `/v1/users/internal/addresses/{addressId}`. Both require `X-Service-Authorization: Bearer <service JWT>` with audience `"user-service"`.
- **HTTP out:** none in Phase 2. (Internal calls are inbound only.)
- **AMQP in:** 2 events consumed from the `logistics.events` topic exchange — `user.registered` (from auth-service) and `user.role_changed` (from auth-service). Queue: `user-service.user-events`. DLQ: `user-service.user-events.dlq`. 3-retry policy via Rabbit nack.
- **AMQP out:** 1 event published — `driver.availability.changed`.
- **Database:** isolated Postgres (Neon in prod). No other service touches this database, ever.

---

## Local development

```bash
# 1. Bring up the platform infra stack (RabbitMQ — Redis not needed by this service)
cd ../logistics-infrastructure && ./scripts/bootstrap.sh && cd ../logistics-user-service

# 2. Start the user-service Postgres (port 5433 to avoid colliding with auth-service's 5432)
docker compose -f docker-compose.dev.yml up -d

# 3. First-time only: install + migrate
npm install                                                    # NODE_AUTH_TOKEN required (read:packages scope) for the @angelocp-01/logistics-contracts dep
export USER_DB_URL="postgresql://user:pass@localhost:5433/userdb?schema=public"
npx prisma migrate deploy

# 4. Configure .env (one-time)
cp .env.example .env
# edit .env — generate the two JWT secrets with:
#   openssl rand -hex 32   (≥32 chars required by the env schema; USER_JWT_SECRET and USER_SERVICE_JWT_SECRET must differ)
# USER_JWT_SECRET must match auth-service's AUTH_JWT_SECRET for the tokens auth mints to verify here.

# 5. Run dev server (npm run dev auto-loads .env via tsx --env-file)
npm run dev
```

The Postgres data volume (`user_pg_data`) persists across `docker compose down/up`. To reset to a clean DB:

```bash
docker compose -f docker-compose.dev.yml down -v   # the -v drops volumes
docker compose -f docker-compose.dev.yml up -d
npx prisma migrate deploy
```

## Tests

```bash
npm test               # unit (domain + application) — no containers, ~5s
npm run test:int       # integration — testcontainers Postgres + RabbitMQ, ~4-5min
npm run test:all       # both
```

## Exercise the service

User-service profile rows are spawned **only by consumed AMQP events** — there is no `POST /v1/users` endpoint. Use the REST Client file at [`docs/user-service.http`](docs/user-service.http) to fire every endpoint. Open in VS Code with the `humao.rest-client` extension, then click "Send Request" above any block. Named requests (`# @name createHome`, `# @name createWork`) auto-capture address ids so subsequent requests use them via `{{createHome.response.body.id}}` — no copy-paste.

The file walks through the manual seed flow:

1. **Seed a profile** — either run auth-service alongside (`npm run dev` in `../logistics-auth-service`) and call `POST /v1/auth/register`, or publish a fake `user.registered` envelope manually via the RabbitMQ management UI (`http://localhost:15672`, guest/guest). The bottom of the .http file has the exact envelope shape.
2. **Mint a JWT** for the seeded userId using the node one-liner at the top of the .http file (signed with `USER_JWT_SECRET`, which must equal auth-service's `AUTH_JWT_SECRET`).
3. **Paste tokens** into the `@customerToken` / `@driverToken` / `@adminToken` / `@serviceToken` variables at the top of the file.
4. **Exercise** the customer flow, address CRUD, driver onboarding + availability, admin synthesized `/me`, internal endpoints, and the negative-path probes.

The file includes:
- The full customer flow (`GET /me` → `POST /addresses` (×2) → `PUT /default-address` → `PATCH /me/addresses/{id}` → `DELETE /addresses/{id}` with the 409-default trap)
- Driver onboarding (`PATCH /me/driver` → `PUT /me/availability` true → false) with the AMQP republish
- Admin synthesized `GET /me` (no DB lookup)
- Service-JWT internal endpoints (driver lookup, address lookup)
- Manual RabbitMQ seed envelopes for `user.registered` (customer + driver) and `user.role_changed` (promote + demote + cleanup republish)
- Negative-path probes (no auth, bogus JWT, wrong role, incomplete driver, unowned address, out-of-range coords, user JWT on internal endpoint, wrong-audience service JWT) for spot-checking the RFC 7807 error shapes

## Build + Docker

```bash
npm run build                   # tsc → dist/
DOCKER_BUILDKIT=1 docker build \
  --secret id=NODE_AUTH_TOKEN,env=NODE_AUTH_TOKEN \
  -t user-service:local .
```

The Dockerfile uses BuildKit `--mount=type=secret,id=NODE_AUTH_TOKEN` (NOT `ARG NODE_AUTH_TOKEN`) so the PAT never persists in image layer history.

## Environment variables

See `.env.example`. Required:

- `USER_DB_URL` — Neon pooled endpoint in prod; local Postgres in dev (port 5433)
- `USER_JWT_SECRET` — ≥32 chars (verifies user JWTs minted by auth-service; **must match auth-service's `AUTH_JWT_SECRET`**)
- `USER_SERVICE_JWT_SECRET` — ≥32 chars (verifies service JWTs from dispatch-service + order-service; **must differ from `USER_JWT_SECRET`** — enforced by `.refine` at boot)
- `RABBITMQ_URL` — platform infra (CloudAMQP in prod, container in dev)
- `LOG_LEVEL`, `LOG_SERVICE_NAME` — pino config
- `PORT` — defaults to 3001 in dev; Render assigns in prod
- `NODE_ENV` — `development` / `test` / `production`

## HTTP endpoints

See [`../logistics-contracts/openapi/user-service.yaml`](../logistics-contracts/openapi/user-service.yaml) (v0.3.0) for the authoritative shape. Quick map:

| Method | Path                                              | Auth                              |
| ------ | ------------------------------------------------- | --------------------------------- |
| GET    | `/v1/users/me`                                    | bearer (user JWT)                 |
| PATCH  | `/v1/users/me`                                    | bearer (rejects admin)            |
| GET    | `/v1/users/me/addresses`                          | bearer (rejects admin)            |
| POST   | `/v1/users/me/addresses`                          | bearer (rejects admin)            |
| PATCH  | `/v1/users/me/addresses/{id}`                     | bearer (rejects admin)            |
| DELETE | `/v1/users/me/addresses/{id}`                     | bearer (rejects admin) — 409 if default |
| PUT    | `/v1/users/me/default-address`                    | bearer (rejects admin)            |
| PATCH  | `/v1/users/me/driver`                             | bearer (requires driver)          |
| PUT    | `/v1/users/me/availability`                       | bearer (requires driver) — 409 if !profileComplete |
| GET    | `/v1/users/internal/drivers/{userId}`             | service JWT (`X-Service-Authorization`) |
| GET    | `/v1/users/internal/addresses/{addressId}`        | service JWT (`X-Service-Authorization`) |
| GET    | `/healthz`                                        | public                            |
| GET    | `/readyz`                                         | public (checks DB + RabbitMQ)     |

All errors use RFC 7807 with `application/problem+json` and `type: urn:logistics:user:<code>`. See spec §4.5 for the type-URI catalog.

## Events consumed (two)

- `user.registered` → INSERT `customer_profiles` row; if role=driver, also INSERT incomplete `driver_profiles` row
- `user.role_changed` → cleanup driver row on demotion (publishing a final `driver.availability.changed` with `isAvailable=false` if the driver was available); defensive customer-row insert if missing (handles out-of-order delivery)

## Events published (one)

- `driver.availability.changed` — payload `{ userId, isAvailable, changedAt }`. Published after DB commit when:
  - Driver toggles availability via `PUT /v1/users/me/availability` (in either direction)
  - `user.role_changed` cleanup demotes an available driver (final `isAvailable=false`)

Envelope: [`../logistics-contracts/schemas/event-envelope.json`](../logistics-contracts/schemas/event-envelope.json). Routing key maps directly to event type. AsyncAPI catalog: [`../logistics-contracts/events/asyncapi.yaml`](../logistics-contracts/events/asyncapi.yaml).

## Conventions

This repo follows the platform's coding-principles and coding-conventions documents (see CLAUDE.md for @-imports). Highlights:

- Layer rule: `interfaces → application → domain ← infrastructure`. Imports outside this direction are CI failures.
- Strict TDD on `domain/` and `application/`. Risk-based integration tests on `infrastructure/` and `interfaces/`.
- Errors: typed `DomainError` subclasses; central middleware maps to RFC 7807.
- Vendored configs: `tsconfig.base.json`, `eslint.config.mjs`, `prettier.config.mjs` are copies of the canonical at `logistics-infrastructure/shared/`.
- Customer-base schema model: customers + drivers have a `customer_profiles` row; drivers also have a `driver_profiles` extension row; admins have neither (GET /me synthesizes from JWT).
- Event consumers are idempotent by design via the `processed_events` table; the dedup record + side effects + commit happen in one Prisma transaction.
