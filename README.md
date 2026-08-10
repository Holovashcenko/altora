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

Requires **Node 22+** and **pnpm 11** (`corepack enable pnpm`).

```bash
pnpm install
pnpm db:up        # start PostgreSQL (required for the API)
pnpm db:migrate   # apply database migrations (requires apps/api/.env)
pnpm dev          # runs every app in watch mode
```

Copy `apps/api/.env.example` to `apps/api/.env` before running migrations.

| Command          | Description                               |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | Run all apps in watch mode                |
| `pnpm build`     | Build every package in dependency order   |
| `pnpm lint`      | ESLint across the workspace               |
| `pnpm typecheck` | TypeScript with no emit                   |
| `pnpm test`      | Run test suites                           |
| `pnpm format`    | Format with Prettier                      |
| `pnpm clean`     | Remove build artifacts and `node_modules` |
| `pnpm db:up`     | Start local PostgreSQL via Docker         |
| `pnpm db:migrate`| Apply API database migrations             |

The admin app runs on `http://localhost:5173`, the API on `http://localhost:4000`.
Requests to `/api` from the admin dev server are proxied to the API.

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

docs/                 Architecture notes and ADRs
.github/              CI workflows
```

---

## 🛣 Roadmap

- [x] Project initialization
- [ ] Authentication
- [ ] Restaurant management
- [ ] Hall builder
- [ ] Table management
- [ ] Menu management
- [ ] QR ordering
- [ ] Kitchen dashboard
- [ ] Waiter dashboard
- [ ] Real-time updates
- [ ] Kafka integration
- [ ] Analytics
- [ ] CI/CD
- [ ] Production deployment

---

## 📄 License

MIT
