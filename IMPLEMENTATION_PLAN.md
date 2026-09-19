# POS System — Implementation Plan

Status legend: `[x]` implemented in this repo now · `[ ]` planned / suggested (next phases)

Two deliverables live here:

- `POS-API/` — advanced backend (Express + TypeScript + **PostgreSQL** + **Redis** + BullMQ + Socket.IO) — **implemented in this change**
- `POS-APP/` — minimalist POS front-end (React Router 7 + Tailwind 4) — **design suggested in this change** (`POS-APP/docs/ui-design.md`), implementation is a follow-up

---

## 1. API plan (POS-API) — implemented

### 1.1 Stack

| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node ≥18 + TypeScript (strict) | existing |
| HTTP | Express 4 | existing |
| Database | **PostgreSQL 16 via Prisma** | replaces Mongoose/MongoDB; money stored as integer cents |
| Cache / locks / pub-sub | **Redis** (`redis` v4) | optional-by-config, graceful degradation |
| Queues / worker | **BullMQ** (separate worker process) | daily report aggregation, low-stock checks |
| Realtime | Socket.IO with **JWT handshake auth** | `order:created`, `stock:low` events |
| Auth | JWT access+refresh, roles `ADMIN / MANAGER / CASHIER`, refresh rotation with bcrypt-stored hash | evolved from admin-only |
| Validation | Zod schemas in `zod/`, central `config/env.ts` for env | no stray `process.env` reads in new code |
| Tests | Jest + Supertest, fully hermetic (Prisma/Redis mocked) | no live DB required |

### 1.2 Domain model (PostgreSQL)

```
Store ──< User (staff, role)          Category ──< Product ──< StockMovement
        └──< Order ──< OrderItem >── Product
                    └──< Payment
Customer ──< Order
```

- `Product`: `sku`, `barcode`, `priceCents`, `costCents`, `taxRateBps` (basis points), `stock`, `lowStockThreshold`, `isActive` (soft delete)
- `Order`: `orderNumber`, `status` (`PENDING/PAID/VOID/REFUNDED`), money fields in `*Cents`, snapshots in `OrderItem` (`nameSnapshot`, `skuSnapshot`, `unitPriceCents`)
- `StockMovement`: append-only ledger (`SALE / REFUND / PURCHASE / ADJUST / VOID`)

### 1.3 Endpoints (all zod-validated)

| Area | Endpoints | Access |
|---|---|---|
| Auth | `POST /api/auth/login`, `/refresh`, `/logout`, `GET /api/auth/me` | public / public / authed / authed |
| Legacy aliases | `POST /api/auth/admin/login|refresh|logout`, `GET /api/auth/admin/me` | ADMIN-only login; kept for template compat |
| Products | `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/:id`, `GET /api/products/barcode/:code`, `POST /api/products/:id/stock-adjust` | MANAGER+ write, CASHIER read |
| Categories | `GET/POST /api/categories`, `PATCH/DELETE /api/categories/:id` | MANAGER+ write |
| Customers | `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/:id` | authed read, MANAGER+ write |
| Orders | `POST /api/orders` (checkout, `Idempotency-Key` header), `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/void` | void = MANAGER+ |
| Reports | `GET /api/reports/summary?date=YYYY-MM-DD` | MANAGER+ |
| Health | `GET /api/health` (db + cache + queue status) | public |

### 1.4 Advanced behaviors

1. **Transactional checkout** — single Prisma `$transaction`: guarded stock decrement (`stock >= qty`), order + items + payments + stock-movements inserted atomically; money math in integer cents; tax per line from `taxRateBps`.
2. **Idempotency** — `Idempotency-Key` header on checkout: Redis `SET NX EX` claim, stored response replay, in-flight 409 conflict, claim released on failure; pass-through when Redis is off.
3. **Cache strategy** — catalog list cache with prefix invalidation on any product/category mutation; report summary cache; health cache (existing).
4. **Queues (BullMQ)** — worker process runs `report:daily` (repeatable, warms report cache) and `stock:low-alert` (enqueued after each checkout); worker publishes results to Redis pub/sub channel `pos:events`; API subscriber re-emits over Socket.IO (`stock:low`).
5. **Socket auth** — JWT required in handshake (`auth.token`); rooms per store (`store:{id}`); `order:created` / `order:voided` broadcast to store room.
6. **Graceful degradation** — Redis/queue off ⇒ caching, idempotency, realtime alerts disabled but API fully functional; DB down ⇒ health reports `db: down` but process stays up in dev.
7. **Central env** — `config/env.ts` parses/validates `.env` with Zod once; fail-fast on invalid/missing `DATABASE_URL`/JWT secrets in production.

### 1.5 File map (new/changed)

```
POS-API/
├── config/            env.ts, prisma.client.ts, redis.client.ts (+pub/sub), queues.ts
├── app/
│   ├── common/        errors.ts, asyncHandler.ts, guards (auth + requireRoles), validate.middleware.ts
│   ├── controllers/   auth, product, category, customer, order, report
│   ├── routes/        auth.module.ts, product.module.ts, category.module.ts, customer.module.ts, order.module.ts, report.module.ts
│   ├── services/      auth, product, category, customer, order, report, idempotency, cache (extended)
│   ├── types/         express.d.ts (req.user)
│   └── app.module.ts  mounts routers + error handling + health v2
├── prisma/            schema.prisma (postgresql), seed.ts
├── socket/            socket.server.ts (+JWT handshake)
├── worker/            index.ts (BullMQ), jobs/report.job.ts, jobs/low-stock.job.ts
├── zod/               auth, product, category, customer, order, shared
└── tests/             unit: pricing, idempotency, auth.service, orders.service · routes: orders.routes, health
```

### 1.6 Gates (must be green before "done")

`npm run lint` → `npx tsc --noEmit` → `npm test` → `npm run build` · `prisma generate` must succeed.

### 1.7 Phased roadmap (suggested next)

- [x] Shifts & cash-drawer (open/close, cash counts, Z-report)
- [x] Refunds (partial line-level, vs void) + receipts (PDF/thermal ESC/POS)
- [ ] Purchase orders / supplier restock flow
- [ ] OpenAPI 3.1 spec + Swagger UI; generated typed client for POS-APP
- [ ] Postgres row-level audit log for price/stock edits
- [ ] Metrics (prom-client) + structured pino logging + request tracing
- [ ] CI: lint/typecheck/test/build matrix + ephemeral Postgres service for integration tests

---

## 2. APP plan (POS-APP) — suggested design (minimalist)

Implemented in a later change; full design in `POS-APP/docs/ui-design.md`. Summary:

- **Design language**: monochrome + one accent (emerald), Inter, 8pt spacing grid, 2 radii (8/14), zero decoration — content is the interface.
- **Screens**: Login → Dashboard (today's numbers) → **Register** (sell screen, the core) → Orders → Orders/:id → Products → Customers → Settings.
- **Register layout**: 3 panes — categories+search (left, 240px) · product grid (center, fluid) · cart+pay (right, 380px, fixed). Cash-first payment flow, keyboard-friendly (F2 search, F8 pay).
- **Data**: REST client (`app/lib/httpClient.ts`) + Socket.IO for `order:created`/`stock:low`; money displayed as `cents / 100`.
- **Stack stays**: React Router 7 (framework mode) + Tailwind 4; feature-based folders per `zenncode.md`.

### 2.1 APP roadmap (suggested)

- [ ] Phase 1: auth (token storage, refresh interceptor), shell/nav, Dashboard read-only
- [ ] Phase 2: Register (grid, cart, cash/card checkout with Idempotency-Key)
- [ ] Phase 3: Orders list/detail + void, Products CRUD + stock adjust
- [ ] Phase 4: Reports (summary cards + 14-day sparkline), realtime badges, a11y + offline cart in IndexedDB

---

## 3. Ground rules (both projects)

- Ratchets only tighten (coverage / quality gates) — never loosened to make a change pass.
- Docs updated in the same change as behavior (`endpoints.md`, `prisma.md`, `project-purpose-flow.md`, `worker.md`, READMEs).
- Privacy: test users + seeded data only; never production secrets or real PII in prompts/logs/evidence.
