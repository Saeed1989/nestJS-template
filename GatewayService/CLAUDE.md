# API gateway

## Role in the system
The third and final service in this architecture (alongside auth-config and data,
each in their own separate project folder). This is the only publicly-facing
service — auth-config and data should not be exposed directly once this exists.

## Responsibility
- Pure reverse proxy: forwards /auth/* and /config/* to the auth-config service,
  and /items/* to the data service. No business logic, no database, no auth
  logic of its own — token validation happens downstream, not here.
- Cross-cutting concerns only: CORS, security headers (helmet), rate limiting,
  a health check endpoint.

## Downstream services (already built, separate projects)
- Auth & config service: AUTH_SERVICE_URL (default http://localhost:3001)
  owns /auth/* and /config/*
- Data service: DATA_SERVICE_URL (default http://localhost:3000)
  owns /items/*

## Stack
- NestJS 10, TypeScript
- http-proxy-middleware for the actual proxying
- helmet, @nestjs/throttler, built-in CORS

## Commands
- npm run start:dev

## Don'ts
- Don't add any Prisma/database dependency to this service — it has none
- Don't decode or validate JWTs here — that's the downstream services' job
- Don't duplicate DTOs or route logic from the other services — if a route
  needs its own validation, that belongs in the owning service, not here