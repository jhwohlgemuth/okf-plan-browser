# Execution lanes

[code-health-hardening.md](code-health-hardening.md) is coordination only.
Each phase takes its plan's primary lock; do not run phases concurrently if their exact write
sets intersect, even when their named locks differ.

| Plan | Primary lock | Phases |
|---|---|---|
| [Desktop ingest](tauri-desktop-ingest.md) | desktop application packaging | TD-03 |
| [Persist portfolio changes without rewriting on navigation](persistence-write-scope.md) | portfolio storage | PS-01 |
| [Track refresh work independently for each repository](refresh-concurrency.md) | refresh lifecycle | RF-01 |

## Write collisions

- Most UI phases touch e2e/integrity.spec.ts: integrate those test edits serially.
- TD-03 requires external artifacts and platform access. Do not interpret that waiting as active execution time.
