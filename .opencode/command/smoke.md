---
description: 60-second sanity check — boot, login, main page via smoke-ai.
agent: orchestrator
---

Smoke-check $ARGUMENTS (default: staging):

1. Invoke @smoke-ai (boot + login with test user + main page 200, each <2s).
2. PASS only if all green in <60s, else FAIL with logs. Max one retry.