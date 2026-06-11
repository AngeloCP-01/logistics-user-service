# logistics-user-service — Repo Guide

> Customer and driver profiles, addresses, preferences.

**Phase:** 2 (Gateway + User)
**Status:** ✅ v0.1.0 shipped + CI green + GHCR image published

## What this service does

Owns user profile data — everything about a user EXCEPT credentials. Profiles are provisioned when `auth-service` publishes `user.registered`. Provides driver profile lookups to `dispatch-service` and address lookups to `order-service`.

## Locked decisions

- **Tech**: Node 20 LTS, TypeScript, Express, Prisma + Neon Postgres, Jest.
- **Events consumed**: `user.registered` (provision a profile row).
- **Events published**: `driver.availability.changed` (when a driver toggles availability).
- **Sync HTTP exposed**: `/v1/users/me` (caller's profile via gateway), plus internal-only endpoints for `dispatch-service` (driver profile by id) and `order-service` (address resolution) — these require a service JWT.
- **Public endpoints** (via gateway): `/v1/users/me`, `/v1/users/me/addresses/*`, `/healthz`, `/readyz`.

## Database (Neon Postgres)

Tables (finalized in User spec):
- `customer_profiles` — user_id (FK to auth), display_name, phone, default_address_id, preferences (JSONB).
- `driver_profiles` — user_id, display_name, phone, vehicle_type, license_plate, is_available (boolean), current_lat, current_lng, last_seen_at.
- `addresses` — id, user_id, label, street, city, country, lat, lng, created_at.

## Conventions

- Same as platform: pino, Zod, `/healthz` + `/readyz`, RFC 7807, Conventional Commits.
- Env prefix: `USER_*` (e.g., `USER_DB_URL`).
- The `user.registered` consumer is idempotent — duplicate event delivery must not create duplicate profiles. Use a unique constraint on `user_id` and upsert.

## Locked decisions (from spec)

See [`../docs/superpowers/specs/2026-05-29-user-service-design.md`](../docs/superpowers/specs/2026-05-29-user-service-design.md) §1 for full reasoning.

| # | Decision |
|---|---|
| 1 | Dispatch-service owns the available-drivers Redis set with last lat/lng. User-service stores **no** location data. |
| 2 | Bare-minimum driver onboarding: driver row created `incomplete` on `user.registered`; `is_available` gated by `profile_complete`. |
| 3 | No `preferences` column. Notification-service owns its own preferences table in Phase 6. |
| 4 | Client-side geocoding only. User-service validates `{lat, lng}` shape + range; never calls a geocoder. |
| 5 | Customer-base schema: `customer_profiles` exists for customers + drivers; `driver_profiles` is a thin extension row for drivers only. Admins have no profile row. |
| 6 | API surface: public CRUD on `/v1/users/me` + `/v1/users/me/addresses` + driver sub-resources; internal endpoints under `/v1/users/internal/*` gated by service JWT. No generic `POST /v1/users` collection, no `GET /v1/users/{id}`. |
| 7 | Events consumed: `user.registered`, `user.role_changed`. Event published: `driver.availability.changed` (minimal payload). |
| 8 | Phone stored as plain string, 7–20 chars, nullable. No E.164 normalization. |

## Don't do

- Don't store credentials or password hashes here. That's `auth-service`.
- Don't allow profile creation via direct HTTP. Profiles only spawn from the `user.registered` event.
- Don't expose driver PII (phone, license) on public endpoints. Customers see only `display_name` and `vehicle_type`.

## Pointers

- Spec: [`../docs/superpowers/specs/2026-05-29-user-service-design.md`](../docs/superpowers/specs/2026-05-29-user-service-design.md)
- Plan: [`../docs/superpowers/plans/2026-05-29-phase-2-user-service.md`](../docs/superpowers/plans/2026-05-29-phase-2-user-service.md)
- OpenAPI: [`../logistics-contracts/openapi/user-service.yaml`](../logistics-contracts/openapi/user-service.yaml)
- Tracker: [`../docs/superpowers/tracker.md`](../docs/superpowers/tracker.md)
