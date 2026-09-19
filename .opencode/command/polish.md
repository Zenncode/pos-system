---
description: Non-stop polish loop — re-run Tier 1 until lint + typecheck + tests + coverage all green.
agent: orchestrator
---

Polish $ARGUMENTS (default: main...HEAD):

1. Run Tier 1 (same steps as /tier1). Collect failures.
2. On any FAIL, apply @static-ai / @unit-ai / @mutation-ai autofixes, address @reviewer findings (BLOCKER = fix, WARN = issue link), and re-run from step 1.
3. Ratchets only tighten — never loosen thresholds or baselines to pass.
4. Stop only at ALL green; output the final merged table.