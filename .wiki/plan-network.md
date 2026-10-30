# Dependency network

[code-health-hardening.md](code-health-hardening.md) coordinates work and blocks no plan.

## Plans

- [Desktop ingest](tauri-desktop-ingest.md): requires access to packaged installers on each target platform.
- [Persist portfolio changes without rewriting on navigation](persistence-write-scope.md): no upstream plan blocker.
- [Track refresh work independently for each repository](refresh-concurrency.md): no upstream plan blocker.
- [Load branches containing slashes unambiguously](remote-branch-selection.md): no upstream plan blocker.

## Phase edges

- TD-01 supplies the platform matrix before TD-02 can select a native ingest implementation.
- TD-02 precedes TD-03 installer verification when an implementation change is needed.
- All other new phases are independently mergeable; shared files are write collisions, not semantic blockers.
