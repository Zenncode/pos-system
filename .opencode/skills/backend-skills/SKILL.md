---
name: backend-skills
description: Backend skill map. Use when doing API routes, DB migrations, workers, schemas, or backend review with free Zen models.
---

# Backend Skills — model assignments ($0 Zen-only)

Scope: `app/**` (or `src/**`), `config/**`, `middleware/**`, `schemas/**`, `migrations/**`, `tests/**`.

| role | agent | model |
|---|---|---|
| conductor | orchestrator | `opencode/muse-spark-1.3-contributor-free` |
| lint / unit / smoke | static-ai, unit-ai, smoke-ai | `opencode/nemotron-3.5-lightning-free` |
| mutants / contracts / security | mutation-ai, integration-ai, security-ai | `opencode/nemotron-3-ultra-free` |
| regression / perf | regression-ai, perf-ai | `opencode/mimo-v2.5-free` |
| e2e / acceptance | e2e-ai, acceptance-ai | `opencode/muse-spark-1.3-contributor-free` |
| flags | experiment-ai | `opencode/big-pickle` |

Rules:
- Tier 1 first (static, unit, mutation), then Tier 2, then Tier 3. Stop on red.
- Gates: `npm run lint` (secrets + clean-code: no stray env reads, no console.log, no new `any`), `npm run typecheck`, unit, integration, coverage (ratchet tighten-only).
- Block on: secret, stray env read outside config, `console.log`, `any` above baseline, auth fallback, error-text leak.
- Test users + seeded data only. Never prod secrets/PII.