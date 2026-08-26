# Auth & config service — component breakdown

## Modules
- AppModule — root
- PrismaModule — global, wraps the Prisma client
- UsersModule — findByEmail/findById/create/incrementTokenVersion, exported for AuthModule
- AuthModule — register, login, refresh, validate, me
- SettingsModule — /config CRUD (named "Settings" internally to avoid clashing
  with @nestjs/config's own ConfigModule)
- HealthModule — optional, DB connectivity check

## Guards
- JwtAuthGuard — passport-jwt, verifies tokens issued by this service (GET /auth/me, all of /config)
- LocalAuthGuard — passport-local, used only on POST /auth/login
- RolesGuard — restricts /config writes to the admin role

## Strategies
- JwtStrategy — extracts bearer token, verifies against JWT_ACCESS_SECRET, returns { id, email, roles }
- LocalStrategy — validates email/password via bcrypt.compare against the DB

## Interceptors
- LoggingInterceptor — method, path, status, duration per request

## Middleware
- CorrelationIdMiddleware — reads/generates x-request-id, same convention as
  the data service, so one request traces across both

## Pipes
- Global ValidationPipe (whitelist + transform)

## Exception filters
- AllExceptionsFilter — normalizes every error response to one shape
- PrismaExceptionFilter — duplicate email → 409, missing lookups → 404

## Decorators
- @CurrentUser() — pulls the user off the request
- @Roles() — role requirement metadata, used on /config writes

## DTOs
- RegisterDto, LoginDto, RefreshTokenDto, ValidateTokenDto
- CreateSettingDto, UpdateSettingDto

## Providers
- AuthService — register, login, refresh, validateAccessToken, issueTokens
- UsersService — Prisma wrapper for User
- SettingsService — Prisma wrapper for Setting

## Dev tooling
- Swagger/OpenAPI at /docs, via @nestjs/swagger + the Nest CLI plugin
- Local DB bootstrap script (scripts/setup-db.ts), same shape as data service's

## Config
- Env validation class — fails fast if JWT_ACCESS_SECRET, JWT_REFRESH_SECRET,
  or DATABASE_URL are missing