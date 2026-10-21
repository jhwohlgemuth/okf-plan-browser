# Execution lanes

[code-health-hardening.md](code-health-hardening.md) is coordination only.
Each phase takes its plan's primary lock; do not run phases concurrently if their exact write
sets intersect, even when their named locks differ.

| Plan | Primary lock | Phases |
|---|---|---|
| [Desktop ingest](plans/tauri-desktop-ingest.md) | desktop application packaging | TD-01, TD-02, TD-03 |
| [Make dropped files match the import interface](plans/folder-drop-contract.md) | folder ingest | FD-01 |
| [Forget folder access when removing saved data](plans/forget-folder-handles.md) | portfolio storage | FH-01 |
| [Persist portfolio changes without rewriting on navigation](plans/persistence-write-scope.md) | portfolio storage | PS-01 |
| [Track refresh work independently for each repository](plans/refresh-concurrency.md) | refresh lifecycle | RF-01 |
| [Load branches containing slashes unambiguously](plans/remote-branch-selection.md) | remote source selection | RB-01 |
| [Make navigation and graph usable without a pointer](plans/accessible-navigation.md) | navigation accessibility | AX-01, AX-02 |
| [Restore and share selected plans and phases](plans/plan-deep-links.md) | selection routing | DL-01, DL-02 |
| [Reduce initial loading and graph layout work](plans/rendering-performance.md) | rendering performance | RP-01, RP-02 |

## Write collisions

- Serialize FD-01, RB-01, and TD-02 because they change useFileSystem.
- Serialize FH-01, PS-01, and DL-01 because they change planStore.
- Serialize AX-01 and RF-01 because they change Sidebar.
- Serialize AX-02 and RP-02 because they change DependencyGraph.
- Serialize DL-01, DL-02, RP-01, and AX-01 when their Layout or detail-panel writes overlap.
- Most UI phases touch e2e/integrity.spec.ts: integrate those test edits serially.
- TD-01 requires external platform access. Do not interpret that waiting as active execution time.
