# Data service — component breakdown

## Modules
- AppModule — root
- PrismaModule — global, wraps the Prisma client
- AuthClientModule — wraps HttpModule + the service that calls Auth & Config
- ItemsModule (rename to real domain) — controller + service + DTOs
- HealthModule — optional, DB connectivity check

## Guards
- RemoteJwtAuthGuard — verifies the bearer token via Auth & Config (or MockTokenValidator per CLAUDE.md until that service exists), attaches request.user
- RolesGuard (shared lib) — only needed where a role beyond "owner or admin" applies

## Interceptors
- LoggingInterceptor — method, path, status, duration per request
- TimeoutInterceptor — bounds the outbound Auth & Config call

## Middleware
- CorrelationIdMiddleware — reads/generates x-request-id, forwards it on the outbound auth call

## Pipes
- Global ValidationPipe (whitelist + transform) — set in main.ts
- ParseUUIDPipe on :id params

## Exception filters
- AllExceptionsFilter — normalizes every error response to one shape
- PrismaExceptionFilter — maps Prisma error codes to proper HTTP statuses

## Decorators
- @CurrentUser() (shared) — pulls the user off the request
- @Roles() (shared) — role requirement metadata
- @Public() — only if the guard becomes global-by-default with per-route opt-out

## DTOs
- CreateItemDto / UpdateItemDto
- PaginationQueryDto — shared shape for list endpoints

## Providers
- ItemsService — business logic + ownership rules
- AuthClientService — outbound call to Auth & Config; add a short-lived validation cache here later

## Config
- Env validation class — fails fast at boot if required env vars are missing

## Local DB bootstrap
- scripts/setup-db.ts — idempotent script that creates the Postgres role and
  database from DATABASE_URL if they don't already exist, connecting via a
  separate POSTGRES_ADMIN_URL since the target role won't exist yet on a
  first run
- npm run db:setup wraps it; safe to re-run any time, never errors on a
  second run