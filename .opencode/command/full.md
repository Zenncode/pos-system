---
description: Full pipeline — Tier 1 → Tier 2 → verify with stop-on-red.
agent: orchestrator
---

Full review on $ARGUMENTS (default: main...HEAD):

0. Invoke @scout on the diff — blast-radius map + dispatch plan (advisory, non-blocking).
1. Run Tier 1 steps (same as /tier1, including @reviewer). Stop if red (any BLOCKER counts).
2. Run Tier 2 steps (same as /tier2). Stop if red.
3. Send the merged table to @verifier; publish VERIFIED MERGE / WITH NOTES / VETO as final.