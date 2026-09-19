---
description: Final verification gate — orchestrator sends the merged table to @verifier for evidence + ratchet check.
agent: orchestrator
---

Verify merged table $ARGUMENTS (paste the tier table + proposed verdict):

1. Invoke @verifier on it — evidence per PASS, tier order, ratchets tightened, no secrets.
2. Publish its verdict line as final: ✅ VERIFIED MERGE / 🟡 VERIFIED WITH NOTES / 🔴 VETO.
3. On VETO, list violated checks; do not merge until fixed and re-verified.