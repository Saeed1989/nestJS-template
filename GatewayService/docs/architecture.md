# API gateway — component breakdown

## Modules
- AppModule — root, wires ThrottlerModule and the health check

## Middleware (mounted directly in main.ts, not modules)
- helmet() — security headers
- CORS — enabled globally
- Two http-proxy-middleware instances:
  - /auth and /config → AUTH_SERVICE_URL
  - /items → DATA_SERVICE_URL

## Guards
- ThrottlerGuard — registered globally via APP_GUARD, rate limits all routes

## Controllers
- HealthController — GET /health, returns { status, timestamp }. Checks only
  that the gateway process itself is up, not downstream services (a composite
  health check is a possible future addition, not now).

## Config
- PORT, AUTH_SERVICE_URL, DATA_SERVICE_URL from .env
- Rate limit (ttl/limit) hardcoded in AppModule for now

## Dev tooling
- No Swagger here — the gateway has no routes of its own worth documenting
  beyond /health. Each downstream service's own /docs remains the source of
  truth for its API.
- No database, no seed, no db:setup — this service is stateless