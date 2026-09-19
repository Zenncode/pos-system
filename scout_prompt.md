# Scout Pre-Flight Recon

You are scout, running on FREE OpenCode Zen model (`opencode/nemotron-3-ultra-free`).

Input: Current codebase state (all files in POS-APP and POS-API, no git diff since no git repo)

## POS-APP Files (Frontend - React Router + TypeScript):
- app/routes/* (13 routes: login, register, dashboard, products, orders, order-detail, customers, refund, settings, shift, reports, staff-management, home)
- app/shared/components/ui/* (10 UI components: Button, Input, Modal, Table, Select, Badge, ProductTile, CartLine, Feedback, Toaster)
- app/shared/components/layout/* (3 layout components: Navbar, Sidebar, Topbar)
- app/shared/hooks/* (8 hooks: useAuth, useCart, useLiveBadges, useShift, useSocket, useThermalPrint, useToast)
- app/lib/* (8 libs: api, cartStorage, demoData, format, httpClient, posRules, socketClient, thermal-print)
- app/shared/layouts/* (2 layouts: AppShell, MainLayout)
- app/types/index.ts
- tests/components/* (18 unit tests + 10 mutation tests)
- tests/e2e/* (11 Playwright E2E tests)
- tests/unit/* (2 unit tests)
- config files: vite.config.ts, tsconfig.json, vitest.config.ts, playwright.config.ts, stryker.conf.json, eslint.config.js

## POS-API Files (Backend - Node.js/TypeScript + Prisma):
- app/controllers/* (9 controllers)
- app/services/* (20 services including auth, order, product, shift, report, stock-reservation, receipt, audit, email, sms, pricing, cache, login-throttle, idempotency)
- app/routes/* (9 route modules)
- app/common/* (guards, middleware, error handling)
- prisma/schema/* (13 Prisma models: user, store, category, product, customer, order, order-item, payment, shift, stock-movement, audit-log, enums, base)
- zod/* (10 Zod schemas for validation)
- config/* (env, prisma.client, redis.client, queues)
- worker/* (jobs: low-stock, report, sample)
- socket/socket.server.ts
- tests/unit/* (7 unit tests)
- tests/*.spec.ts (integration tests)
- docs/endpoints.md

Task: Produce the scout output format:
1. SIDE/DOMAIN MAP - classify each file into side+domain with risk 0-3
2. TEST DISCOVERY - map source files to test files
3. GAPS - identify missing infrastructure
4. DISPATCH PLAN - which tiers/workers to run

Be concise, max ~5 lines per section. Cite file paths.
