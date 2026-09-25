---
name: frontend-skills
description: Frontend skill map. Use when doing client UI, styling, components, UI/UX design, or frontend review with free Zen models.
---

# Frontend Skills — model assignments ($0 Zen-only)

Scope: `src/**` (pages, routes, components, styles, services).

| role | agent | model |
|---|---|---|
| conductor | orchestrator | `opencode/muse-spark-1.3-contributor-free` |
| lint / unit / smoke / fast-iterate | static-ai, unit-ai, smoke-ai | `opencode/nemotron-3.5-lightning-free` |
| mutants / contracts / security / a11y | mutation-ai, integration-ai, security-ai | `opencode/nemotron-3-ultra-free` |
| regression / perf / consistency | regression-ai, perf-ai | `opencode/mimo-v2.6-flash-free` |
| e2e / acceptance / designer | e2e-ai, acceptance-ai | `opencode/muse-spark-1.3-contributor-free` |
| flags | experiment-ai | `opencode/big-pickle` |
| uiux-designer | uiux.designer | `opencode/muse-spark-1.3-contributor-free` |
| uiux-iterate | uiux.fast-iterator | `opencode/nemotron-3.5-lightning-free` |
| uiux-consistency | uiux.consistency | `opencode/mimo-v2.6-flash-free` |
| uiux-a11y | uiux.a11y-check | `opencode/nemotron-3-ultra-free` |

Rules:
- Tier 1 first (static, unit, mutation), then Tier 2, then Tier 3. Stop on red.
- Free tier has no vision — pass copy + tokens as text, verify via Playwright text logs.
- Test users + seeded data only. Never prod secrets/PII.
- Commands: `npm run typecheck`, `npm run test`, `npm run lint`.