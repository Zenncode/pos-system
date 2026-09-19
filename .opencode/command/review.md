---
description: Human review assist (scout recon + reviewer + E2E + acceptance + flag check) — GLM orchestrator fans out to free workers.
agent: orchestrator
---

Assist human review for $ARGUMENTS (paste ticket ID + PR diff or branch):

1. Invoke @scout first with the diff — side/domain map + risk ranks to target the checks below.
2. Invoke @reviewer on the diff — BLOCKER/WARN/NIT findings (logic, data integrity, API shape, security smells).
3. Invoke @acceptance-ai with the user story — strict PASS/FAIL per criterion with file:line evidence.
4. Invoke @e2e-ai for critical journeys (login → main action → logout) via Playwright logs.
5. If a feature flag exists, invoke @experiment-ai (default OFF? deterministic bucketing? metric + sample?).
6. Output a PR-comment-ready checklist the human can paste (reviewer BLOCKERs on top). Humans decide merge, not AI.