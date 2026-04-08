# ProcureCheck test-vendor audit (template)

Do **not** commit live output from `scripts/procurecheck-audit-test-vendors.ts` if it
contains real company names, registration numbers, VAT numbers, or vendor GUIDs.

Generate a fresh report locally:

```bash
bun run procurecheck:audit
```

Only `STC-*` sandbox test vendors should be deleted, and only via the ProcureCheck UI
(there is no delete API).
