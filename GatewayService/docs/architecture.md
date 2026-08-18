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

## Dev tooling
- Aggregated Swagger/OpenAPI at /docs — fetches each downstream service's
  own OpenAPI JSON (their /docs-json) at gateway startup and merges them
  into one combined document, served via swagger-ui-express directly
  (not @nestjs/swagger's SwaggerModule, since gateway routes are middleware
  proxies, not real controllers — there's nothing for it to introspect)
- Paths in the merged doc are left exactly as each service defines them
  (e.g. /items, /auth/login) — since those are already the exact routes
  this gateway proxies, "Try it out" from the merged UI works correctly
  against the gateway itself, no extra config needed
- If a downstream service is unreachable at startup, its section is
  omitted from the merged doc rather than failing gateway startup — this
  is a dev-convenience feature, not a security boundary, so it degrades
  gracefully
- No database, no seed, no db:setup — still stateless; the merged spec
  lives in memory, rebuilt on restart