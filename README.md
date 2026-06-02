# logistics-user-service

Profile + address service for the AI Logistics Platform.

## Spec
- [`../docs/superpowers/specs/2026-05-29-user-service-design.md`](../docs/superpowers/specs/2026-05-29-user-service-design.md)
- [`../docs/superpowers/plans/2026-05-29-phase-2-user-service.md`](../docs/superpowers/plans/2026-05-29-phase-2-user-service.md)

## Architecture
See spec §2 (scope), §3 (schema), §6 (events). Standard layered Node service (`domain/application/infrastructure/interfaces`).

## Local development

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
npx prisma migrate deploy
npm install
npm run dev
```

Then publish a `user.registered` event via the RabbitMQ management UI (`http://localhost:15672`, guest/guest) to seed a profile, sign a JWT, and exercise `/v1/users/me`.

## Running tests

```bash
npm test                  # unit
npm run test:int          # integration (testcontainers Postgres + RabbitMQ)
npm run test:all          # both
```

## Deploy
Render web service. Image published to GHCR by CI on tag push.
