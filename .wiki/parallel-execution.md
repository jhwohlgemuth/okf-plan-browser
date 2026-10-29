# Execution lanes

[code-health-hardening.md](code-health-hardening.md) is coordination only.
Each phase takes its plan's primary lock; do not run phases concurrently if their exact write
sets intersect, even when their named locks differ.

| Plan | Primary lock | Phases |
|---|---|---|
| [Desktop ingest](tauri-desktop-ingest.md) | desktop application packaging | TD-01, TD-02, TD-03 |
| [Make dropped files match the import interface](folder-drop-contract.md) | folder ingest | FD-01 |
| [Forget folder access when removing saved data](forget-folder-handles.md) | portfolio storage | FH-01 |
| [Persist portfolio changes without rewriting on navigation](persistence-write-scope.md) | portfolio storage | PS-01 |
| [Track refresh work independently for each repository](refresh-concurrency.md) | refresh lifecycle | RF-01 |
| [Load branches containing slashes unambiguously](remote-branch-selection.md) | remote source selection | RB-01 |
| [Reduce initial loading and graph layout work](rendering-performance.md) | rendering performance | RP-01, RP-02 |

## Write collisions

- Serialize FD-01, RB-01, and TD-02 because they change useFileSystem.
- Serialize FH-01 and PS-01 because they change planStore.
- Most UI phases touch e2e/integrity.spec.ts: integrate those test edits serially.
- TD-01 requires external platform access. Do not interpret that waiting as active execution time.
