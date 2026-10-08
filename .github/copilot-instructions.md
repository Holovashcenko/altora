# Copilot Instructions for Altora

This document helps Copilot work effectively in the Altora monorepo.

## Architecture Overview

**Altora** is a Restaurant Operating System with a monorepo structure:

- **Frontend:** React 19 + Vite + TypeScript admin dashboard (`apps/admin`)
- **Backend:** NestJS API with JWT authentication (`apps/api`)
- **Database:** PostgreSQL with Prisma ORM
- **Shared code:**
  - `packages/types` — TypeScript interfaces shared between API and admin
  - `packages/ui` — React component library
  - `packages/utils` — Framework-agnostic helpers
  - `packages/eslint-config` — Shared ESLint flat configs (base, react, nest)
  - `packages/tsconfig` — Shared TypeScript base configs
- **Infrastructure:** Docker Compose for local dev (PostgreSQL, Redis planned)
- **Monorepo tooling:** pnpm workspaces + Turbo for builds and tasks

### Multi-Tenancy Model

- Open owner signup: every account created via register gets the `owner` role and owns one restaurant
- Managers and staff are invited later (planned in Restaurant management feature)
- Users are tied to their restaurant; access control re-reads the user on every request

## Commands

### Development

| Command                           | Purpose                                                   |
| --------------------------------- | --------------------------------------------------------- |
| `pnpm dev`                        | Run all apps in watch mode (admin on :5173, API on :4000) |
| `pnpm --filter @altora/api dev`   | Run API only                                              |
| `pnpm --filter @altora/admin dev` | Run admin app only                                        |
| `pnpm --filter @altora/ui dev`    | Watch-compile the UI component library                    |
| `pnpm typecheck`                  | TypeScript type-check (no emit) across workspace          |
| `pnpm lint`                       | ESLint across workspace                                   |
| `pnpm lint:fix`                   | ESLint with `--fix`                                       |
| `pnpm format`                     | Prettier format                                           |
| `pnpm format:check`               | Prettier check                                            |

### Building & Testing

| Command                                | Purpose                                                    |
| -------------------------------------- | ---------------------------------------------------------- |
| `pnpm build`                           | Build all packages in dependency order                     |
| `pnpm test`                            | Run unit tests (Jest, matches `*.spec.ts`)                 |
| `pnpm test:e2e`                        | Run e2e tests (needs DB: `pnpm db:up` + `pnpm db:migrate`) |
| `pnpm test:cov`                        | Unit tests with coverage                                   |
| `pnpm --filter @altora/api test:watch` | Run API tests in watch mode                                |
| `pnpm clean`                           | Remove build artifacts and node_modules                    |

### Database

| Command                                    | Purpose                                              |
| ------------------------------------------ | ---------------------------------------------------- |
| `pnpm db:up`                               | Start PostgreSQL via Docker (port 5433, not 5432)    |
| `pnpm db:down`                             | Stop PostgreSQL                                      |
| `pnpm db:migrate`                          | Apply pending Prisma migrations                      |
| `pnpm --filter @altora/api db:migrate:dev` | Create a new migration after editing `schema.prisma` |

### Single Test Example

Run one test file in API:

```bash
pnpm --filter @altora/api test -- --testPathPattern=auth.service.spec
```

Run one test file in e2e:

```bash
pnpm test:e2e -- --testPathPattern=auth.e2e-spec
```

## Key Conventions

### TypeScript & Code Style

- **2 spaces** indentation (EditorConfig + Prettier enforced)
- **Single quotes** in code; double quotes in JSON
- **Print width:** 100 characters
- **Trailing commas** in all multi-line structures
- **Semicolons** required
- **Shared types in `@altora/types`:** Any shape used by both API and admin goes here (e.g., `AuthUser`, `AuthResponse`)
- **No implicit any** — strict TypeScript enabled

### NestJS API Patterns

#### Controllers & Routes

- Routes are prefixed with `/api` globally (`app.setGlobalPrefix`)
- **Protected by default:** a global `JwtAuthGuard` covers every route
- Use `@Public()` decorator on routes that should be unauthenticated (register, login, health)
- Endpoint documentation uses `@ApiOperation`, `@ApiResponse`, etc. from `@nestjs/swagger`

#### DTOs & Validation

- Request/response shapes defined as separate `*.dto.ts` files (e.g., `RegisterDto`, `LoginDto`)
- Validation using `class-validator` decorators (`@IsEmail`, `@MinLength`, etc.)
- Global `ValidationPipe` runs with `whitelist: true` — unknown properties are stripped from request bodies
- All response DTOs are documented in Swagger

#### Mapper Pattern

- Use mapper functions to transform database entities to DTO shapes (e.g., `toAuthUser` in `users/user.mapper.ts`)
- Mappers ensure sensitive fields (like `passwordHash`) never leak

#### Authentication & JWT

- Signed `HS256` with `JWT_SECRET`, expiring after `JWT_EXPIRES_IN` (default `1d`)
- Token payload includes: `sub` (user ID), `email`, `role`, `iat`, `exp`
- **Role is informational only** — the API re-reads the user from the database on every request
- No logout endpoint — tokens are client-discarded; server-side access control is immediate via the database read

#### Modules

- One feature = one `.module.ts` (e.g., `AuthModule`, `UsersModule`)
- Modules export only what's needed by other modules; service is private to its module by default
- Use `PrismaModule` from `src/prisma/prisma.module.ts` to inject `PrismaService`

### React Admin Patterns

- Vite for dev server and builds
- No e2e tests yet; API e2e tests cover contract
- Requests to `/api` proxied to `http://localhost:4000` in dev

### Shared UI Library

- Located in `packages/ui`
- Exports from `dist/index.js`
- No CSS framework yet; build with CSS Modules or inline styles as needed
- Must build before consuming in other packages; use `pnpm --filter @altora/ui dev` to watch

### Database (Prisma)

- Schema in `apps/api/prisma/schema.prisma`
- Migrations live in `apps/api/prisma/migrations/`
- Always generate Prisma client before building/testing: `prisma generate` (baked into build/test scripts)
- Use Prisma Studio to inspect data: `pnpm --filter @altora/api exec prisma studio`

### Testing

- **Unit tests:** Jest, files named `*.spec.ts`, import from `src/`
- **E2E tests:** Jest with a separate config (`test/jest-e2e.json`), run against a real database
- e2e setup in `test/setup-e2e.ts` handles database seeding if needed
- E2E tests should run with `--runInBand` (sequential, not parallel) to avoid database contention

### API Documentation

Detailed docs are in `docs/`:

- **Decisions:** `docs/decisions/0001-authentication.md` (JWT, role model, tenant scope, stateless logout)
- **API endpoints:** `docs/api/authentication.md` (register, login, me endpoints with examples)
- **Plans:** `docs/plans/` — including restaurant management and
  [AI Restaurant Analytics Assistant](../docs/plans/ai-restaurant-analytics-assistant.md)
  (LLM tool-calling over Postgres; never arbitrary SQL; tenant from auth, not the model)

Swagger UI served at `http://localhost:4000/api/docs` (enabled everywhere except production by default).

## Troubleshooting

**Database connection errors**

Check that Docker container is healthy:

```bash
docker ps | grep altora-postgres
```

Verify migrations applied:

```bash
pnpm --filter @altora/api exec prisma migrate status
```

**Port already in use**

API `:4000`, admin `:5173`. Find processes:

```bash
# Windows
netstat -ano | findstr :4000

# macOS/Linux
lsof -iTCP:4000 -sTCP:LISTEN -n -P
```

**Build or test failures after schema changes**

Regenerate Prisma client:

```bash
pnpm --filter @altora/api db:generate
```

Then rebuild and test:

```bash
pnpm build && pnpm test
```

## Environment Setup

API requires `.env` file (see `apps/api/.env.example`):

```bash
cp apps/api/.env.example apps/api/.env
```

Critical variables for local dev:

- `DATABASE_URL` — Postgres connection string (default points to Docker on :5433)
- `JWT_SECRET` — Any secret string; use provided example
- `JWT_EXPIRES_IN` — Token TTL (default `1d`)
- `PORT` — API port (default `4000`)
- `SWAGGER_ENABLED` — Expose Swagger (default `true` in dev, `false` in prod)

## First Run Checklist

1. Node 22+ installed (`node --version`)
2. pnpm installed (`corepack enable pnpm`)
3. Docker installed and running
4. `pnpm install`
5. `cp apps/api/.env.example apps/api/.env`
6. `pnpm db:up`
7. `pnpm db:migrate`
8. `pnpm dev`

Visit `http://localhost:5173` (admin) and `http://localhost:4000/api/docs` (API docs).
