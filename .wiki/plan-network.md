# Dependency network

[code-health-hardening.md](code-health-hardening.md) coordinates work and blocks no plan.

## Plans

- [Desktop ingest](plans/tauri-desktop-ingest.md): requires access to packaged installers on each target platform.
- [Make dropped files match the import interface](plans/folder-drop-contract.md): no upstream plan blocker.
- [Forget folder access when removing saved data](plans/forget-folder-handles.md): no upstream plan blocker.
- [Persist portfolio changes without rewriting on navigation](plans/persistence-write-scope.md): no upstream plan blocker.
- [Track refresh work independently for each repository](plans/refresh-concurrency.md): no upstream plan blocker.
- [Load branches containing slashes unambiguously](plans/remote-branch-selection.md): no upstream plan blocker.
- [Make navigation and graph usable without a pointer](plans/accessible-navigation.md): no upstream plan blocker.
- [Restore and share selected plans and phases](plans/plan-deep-links.md): no upstream plan blocker.
- [Reduce initial loading and graph layout work](plans/rendering-performance.md): no upstream plan blocker.

## Phase edges

- TD-01 supplies the platform matrix before TD-02 can select a native ingest implementation.
- TD-02 precedes TD-03 installer verification when an implementation change is needed.
- DL-01 precedes DL-02 because phase anchors extend URL plan selection.
- All other new phases are independently mergeable; shared files are write collisions, not semantic blockers.
