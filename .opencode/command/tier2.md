---
description: Run Tier 2 required checks (integration + smoke + regression) — GLM orchestrator fans out to free workers.
agent: orchestrator
---

Run Tier 2 after Tier 1 passes. Target: $ARGUMENTS (default: staging + HEAD diff):

1. Invoke @integration-ai (migrations + API contracts).
2. Invoke @smoke-ai (GET /health, login, dashboard <60s).
3. Invoke @regression-ai (rank tests, run top 20, then full `pnpm test`).
4. If API routes changed, also invoke @perf-ai. If staging deployed, also invoke @security-ai quick triage.
5. Output merged PASS/FAIL table. Only real breaks block — FLAKY needs 2 green retries.