---
description: Run Tier 1 mandatory checks (static + unit + mutation + reviewer) — Muse Spark orchestrator fans out to free workers.
agent: orchestrator
---

Run Tier 1 on diff $ARGUMENTS (default: main...HEAD):

1. Invoke @static-ai on the diff. Collect blockers.
2. Invoke @unit-ai on the diff. Collect coverage %.
3. Invoke @mutation-ai scoped to changed files only.
4. Invoke @reviewer on the diff — BLOCKER/WARN/NIT findings (logic, data integrity, API shape, security smells).
5. Output one merged table: check | agent | PASS/FAIL | evidence. Block merge on any FAIL or reviewer BLOCKER.