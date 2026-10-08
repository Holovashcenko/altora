# 🚀 Altora

> **Run your restaurant smarter.**

**Altora** is a modern **Restaurant Operating System (Restaurant OS)** designed to simplify restaurant operations through one unified platform.

Instead of juggling multiple tools for menus, orders, kitchen management, and staff coordination, Altora brings everything together in a single ecosystem.

---

## ✨ Features

### 🏢 Restaurant Management

- Multi-tenant architecture
- Restaurant settings
- Dining halls management
- Interactive table layout

### 🍽 Menu Management

- Categories
- Menu items
- Images
- Multi-language support
- Availability management

### 📱 QR Ordering

- QR code generation
- Digital menu
- Customer ordering
- Order tracking

### 👨‍🍳 Kitchen Dashboard

- Incoming orders
- Preparation workflow
- Order status management
- Real-time updates

### 🧑‍💼 Waiter Dashboard

- Table overview
- Active orders
- Customer requests
- Payment handling

### 📊 Analytics

- Sales overview
- Popular dishes
- Restaurant performance

### 🤖 AI Analytics Assistant

- Natural-language questions over real restaurant data
- Controlled backend tools (revenue, comparisons, top products, busy hours, tables)
- Streaming answers with conversation history
- Multi-tenant isolation — the model never chooses `restaurantId` or runs SQL

See the [implementation plan](docs/plans/ai-restaurant-analytics-assistant.md).

---

## 🏗 Architecture

Altora is built as a modern full-stack application following scalable architecture principles.

- Frontend — React + TypeScript
- Backend — NestJS
- Database — PostgreSQL
- Cache — Redis
- Messaging — Apache Kafka
- Real-time — WebSockets
- Storage — MinIO
- Containers — Docker
- CI/CD — GitHub Actions

---

## 🌍 Internationalization

Altora is designed with multilingual support from day one.

Supported languages:

- 🇺🇦 Ukrainian
- 🇬🇧 English

More languages can be added without changing the database structure.

---

## 🎯 Vision

Our goal is to create a platform where restaurant owners can manage their entire business from one place.

From designing the dining hall and generating QR menus to managing kitchen workflows and analyzing restaurant performance, Altora aims to become the operating system that powers modern restaurants.

---

## 🚦 Getting Started

Requires **Node 22+**, **pnpm 11** (`corepack enable pnpm`), and **Docker**.

### First run

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # API config; must exist before migrating
pnpm db:up                               # start PostgreSQL via Docker
pnpm db:migrate                          # apply database migrations
pnpm dev                                 # run every app in watch mode
```

### Afterwards

```bash
pnpm db:up   # only if the container is not already running
pnpm dev
```

The admin app runs on `http://localhost:5173`, the API on `http://localhost:4000`
(health check at `http://localhost:4000/api/health`).
Requests to `/api` from the admin dev server are proxied to the API.

### API documentation

Swagger UI is served at [`http://localhost:4000/api/docs`](http://localhost:4000/api/docs),
with the raw OpenAPI document at `/api/docs.json`. It is enabled everywhere
except production; set `SWAGGER_ENABLED=true` to expose it there as well.

### Commands

| Command                                    | Description                                       |
| ------------------------------------------ | ------------------------------------------------- |
| `pnpm dev`                                 | Run all apps in watch mode                        |
| `pnpm --filter @altora/api dev`            | Run the API only                                  |
| `pnpm --filter @altora/admin dev`          | Run the admin app only                            |
| `pnpm build`                               | Build every package in dependency order           |
| `pnpm lint`                                | ESLint across the workspace                       |
| `pnpm typecheck`                           | TypeScript with no emit                           |
| `pnpm test`                                | Run unit test suites                              |
| `pnpm test:e2e`                            | Run e2e tests (needs `pnpm db:up` + `db:migrate`) |
| `pnpm format`                              | Format with Prettier                              |
| `pnpm clean`                               | Remove build artifacts and `node_modules`         |
| `pnpm db:up`                               | Start local PostgreSQL via Docker                 |
| `pnpm db:down`                             | Stop the PostgreSQL container                     |
| `pnpm db:migrate`                          | Apply API database migrations                     |
| `pnpm --filter @altora/api db:migrate:dev` | Create a migration after editing `schema.prisma`  |

### Troubleshooting

PostgreSQL is published on host port **5433**, not the default 5432, so it does not
collide with a PostgreSQL installed directly on your machine. `DATABASE_URL` in
`apps/api/.env.example` already points there.

- **Database connection errors** — check that `docker ps` lists `altora-postgres` as
  `healthy`, then verify schema state with
  `pnpm --filter @altora/api exec prisma migrate status`.
- **Port already in use** — find the owning process with
  `lsof -iTCP:4000 -sTCP:LISTEN -n -P` (or `:5173`).

---

## 📂 Project Structure

```text
apps/
  admin/              React + Vite + TypeScript dashboard
  api/                NestJS backend

packages/
  ui/                 Shared React component library
  types/              Shared domain types and API contracts
  utils/              Framework-agnostic helpers
  eslint-config/      Shared ESLint flat configs
  tsconfig/           Shared TypeScript base configs

infrastructure/
  docker/             Compose stacks and production images
  nginx/              Reverse-proxy configuration
  scripts/            Operational scripts

docs/                 Architecture notes, ADRs, and feature plans
.github/              CI workflows
```

---

## 📚 Documentation

- [docs/](docs/README.md) — ADRs, API notes, and implementation plans
- [Authentication ADR](docs/decisions/0001-authentication.md)
- [Restaurant management plan](docs/plans/restaurant-management.md)
- [AI Restaurant Analytics Assistant plan](docs/plans/ai-restaurant-analytics-assistant.md)

---

## 🛣 Roadmap

- [x] Project initialization
- [x] Authentication
- [x] Restaurant management (API tenancy + RBAC; admin settings UI / invites still open)
- [ ] Hall builder
- [ ] Table management
- [ ] Menu management
- [ ] QR ordering
- [ ] Kitchen dashboard
- [ ] Waiter dashboard
- [ ] Real-time updates
- [ ] Kafka integration
- [ ] Analytics
- [ ] AI Restaurant Analytics Assistant ([plan](docs/plans/ai-restaurant-analytics-assistant.md))
- [ ] CI/CD
- [ ] Production deployment

---

## 📄 License

MIT
