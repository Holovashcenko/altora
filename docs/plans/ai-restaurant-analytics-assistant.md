# AI Restaurant Analytics Assistant — Implementation Plan

Portfolio/MVP feature: **AI-powered restaurant business analytics** for owners and
managers. Natural-language questions answered from **real PostgreSQL data** via
controlled backend tools — never arbitrary SQL, never invented metrics.

Builds on existing auth + multi-tenant restaurant membership
([ADR 0001](../decisions/0001-authentication.md),
[restaurant management](./restaurant-management.md)).

Indexed from [docs/README](../README.md) and the root [README roadmap](../../README.md#-roadmap).

---

## Current State

| Layer | Status | Reuse for AI |
| ----- | ------ | ------------ |
| Auth / JWT | Done | Global `JwtAuthGuard`, `@CurrentUser()` |
| Tenancy / RBAC | Done | `RestaurantMemberGuard`, `@Roles()`, `@CurrentRestaurant()` |
| Prisma / Postgres | Done | Migrations; `Restaurant.timezone` / `currency` |
| Admin SPA | Vite + React Router | Protected routes, `apiRequest`, Bearer token |
| Orders / products / tables / analytics | **Missing** | Must add minimal models + seed |
| Redis / rate limits / WebSockets | **Missing** (Redis only in `.env.example`) | Add throttling; Redis only if caching pays off |

**Important:** Tenant is **not** taken from the client. `RestaurantMemberGuard`
resolves the user’s first membership and attaches `req.restaurant`. Tools must use
that `restaurantId` only.

There are no existing analytics services to duplicate — the MVP introduces a lean
domain + query layer, then tool-calling on top.

---

## Goals (MVP)

1. AI assistant UI at `/ai-assistant`
2. LLM integration behind an abstraction
3. Controlled tool calling
4. Revenue + revenue comparison
5. Top products
6. Sales by hour
7. Table performance
8. Tenant isolation
9. Streaming (SSE)
10. Basic conversation history (PostgreSQL)
11. Tests (unit, integration, one E2E)
12. Docker / configuration
13. README / docs

**Out of scope:** RAG, agents, MCP, vector DBs, full QR ordering / kitchen / waiter
flows, multi-restaurant switcher.

---

## 1. Proposed Architecture

```
User (admin /ai-assistant)
  → React chat UI (SSE consumer)
  → NestJS AiAssistantModule
       ├─ JWT + RestaurantMemberGuard + @Roles(owner, manager)
       ├─ ConversationService (Postgres history)
       ├─ AnalyticsToolsService (validated tools → Prisma)
       └─ LlmService (provider abstraction: OpenAI default)
            → tool_calls → backend executes queries via Prisma
            → tool results → LLM narrates numbers (never invents metrics)
  → SSE stream back to UI
```

**Principles**

- LLM never runs SQL and never chooses `restaurantId`.
- Analytics math lives in Nest (deterministic); LLM only picks tools + explains results.
- Prefer **SSE** (no WebSockets in the repo yet).
- Optional Redis cache for expensive aggregates, keyed by `restaurantId` + date range.

Example structured answer (numbers from tools, not the model):

> **Revenue yesterday:** $4,820  
> **Previous Monday:** $5,880  
> **Change:** -18%

---

## 2. Files / Modules to Change or Add

### Backend (`apps/api`)

| Path | Change |
| ---- | ------ |
| `prisma/schema.prisma` + migration | Domain + conversation tables |
| `src/analytics/` | **New** — pure query services (revenue, products, hours, tables) |
| `src/ai/` | **New** — controller, conversation, LLM, tools, streaming, rate limits |
| `src/app.module.ts` | Register `AnalyticsModule`, `AiModule` |
| `src/config/env.validation.ts` | Provider keys, model, token/cost caps |
| `.env.example` | AI + optional Redis |
| `test/` | Unit + e2e (tenant isolation, tools, one chat flow) |

### Frontend (`apps/admin`)

| Path | Change |
| ---- | ------ |
| `src/routes/ai-assistant-page.tsx` | Chat UI |
| `src/lib/ai-api.ts` | Conversations + SSE |
| `src/App.tsx` | `/ai-assistant` under `ProtectedRoute` |
| `src/index.css` | Assistant styles |
| Dashboard / nav | Link to assistant |

### Shared / infra

| Path | Change |
| ---- | ------ |
| `packages/types` | Chat / tool-result / SSE event contracts |
| `docs/` + root `README` | Feature docs, env, how to run |
| `infrastructure/docker` | Optional Redis if we cache |

---

## 3. Database Changes

Operational tables do not exist yet. MVP adds a **minimal analytics domain** (not
full QR/kitchen), plus chat storage and seed data.

### Domain (tenant-scoped)

- `products` — `restaurantId`, name, price, active
- `dining_tables` — `restaurantId`, label/number
- `orders` — `restaurantId`, `tableId?`, `status`, `placedAt`, `totalCents`
- `order_items` — `orderId`, `productId`, qty, `unitPriceCents`, `lineTotalCents`

### Indexes (analytics)

- `orders(restaurant_id, placed_at)`
- `orders(restaurant_id, table_id, placed_at)`
- `order_items(product_id)` (scoped via order’s `restaurant_id` in queries)

### Conversations

- `ai_conversations` — `id`, `restaurantId`, `userId`, `title?`, timestamps
- `ai_messages` — `conversationId`, `role` (`user` \| `assistant` \| `tool`),
  `content`, `toolName?`, `toolPayload?` (JSON), `createdAt`

### Seed

Realistic multi-day orders so demo questions return real numbers.

---

## 4. AI Tools (Controlled)

| Tool | Purpose | Args (validated; **no** `restaurantId`) |
| ---- | ------- | ---------------------------------------- |
| `getRevenue` | Sum completed sales for a range | `from`, `to` (ISO dates / relative presets) |
| `compareRevenue` | Two ranges + % change | `periodA`, `periodB` |
| `getTopProducts` | Qty / revenue leaders | `from`, `to`, `limit` |
| `getSalesByHour` | Hourly buckets | `from`, `to` |
| `getTablePerformance` | Revenue / orders per table | `from`, `to`, `limit` |

Each tool: DTO/Zod validate → inject `restaurantId` from auth → Prisma aggregate →
structured JSON → LLM + UI.

---

## 5. Data Flow

1. User sends message (optional `conversationId`) to `POST /api/ai/chat` (SSE).
2. Guard resolves restaurant; role must be `owner` or `manager`.
3. Load recent messages; append user message.
4. `LlmService.stream()` with system prompt (“only use tool numbers; never invent
   metrics”) + tool schemas.
5. On `tool_call`: validate args → run analytics → append tool result → continue LLM.
6. Stream tokens + structured metric events to the client.
7. Persist assistant message (+ tool payloads as needed).
8. Enforce rate limit + max tokens/cost per request/day.

Follow-ups (“Compare it with last Monday”) work via stored history + tool args
resolved from context.

---

## 6. Security Considerations

- **Tenant:** `restaurantId` only from `@CurrentRestaurant()`, never from LLM/client body.
- **RBAC:** `@Roles('owner', 'manager')` — staff cannot use the assistant.
- **No arbitrary SQL;** whitelist tools only.
- **Secrets:** API keys in env; never in prompts or responses.
- **PII:** send restaurant name/currency/timezone + aggregates, not emails/password hashes.
- **Cross-tenant tests:** assert restaurant A tools never see restaurant B orders.
- **Abuse:** Nest throttler (in-memory OK for MVP; Redis later).
- **Cost:** max tool rounds, max tokens, daily budget per restaurant/user.

---

## 7. Implementation Steps

| Step | Deliverable |
| ---- | ----------- |
| **1** | Prisma domain + conversation models, indexes, seed |
| **2** | `AnalyticsService` + unit tests (revenue, compare, top products, hours, tables) |
| **3** | `LlmService` abstraction + OpenAI tool-calling provider |
| **4** | `AiAssistant` controller: SSE chat, conversation CRUD, tool loop, rate/cost limits |
| **5** | Integration/e2e: tenant isolation + one full Q&A with seeded data |
| **6** | Admin `/ai-assistant` UI (stream, suggestions, metric cards, history) |
| **7** | Env/Docker/README; optional Redis cache for heavy queries |

---

## Design Choices (MVP)

1. **Introduce lean order/product/table schema** instead of waiting for full QR
   ordering — otherwise there is nothing real to query.
2. **Deterministic analytics module first**, then AI as a thin orchestrator over
   those tools (testable and portfolio-friendly).
3. **OpenAI behind `LlmService`**; Anthropic can be a second provider later.
4. **SSE**, not WebSockets.
5. **Skip Redis** until a query is slow enough to cache; still wire rate limits
   without Redis.
6. **Vite admin** (`/ai-assistant`), not Next.js.

---

## Suggested Questions (UI)

- How was revenue yesterday?
- Compare yesterday with last Monday.
- What are our top products this week?
- What were the busiest hours?
- Which tables generated the most revenue?

---

## Exit Criteria

- Owner/manager can open `/ai-assistant`, ask the questions above, and get answers
  backed by tool results from Postgres.
- Staff receives 403.
- Cross-tenant isolation covered by tests.
- Streaming works in the UI; conversations persist across refresh.
- Env vars documented; feature runnable via existing `pnpm` / Docker Postgres flow.
