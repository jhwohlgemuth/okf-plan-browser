# Dependency network

[code-health-hardening.md](code-health-hardening.md) coordinates work and blocks no plan.

## Plans

- [Desktop ingest](tauri-desktop-ingest.md): TD-03 requires draft release artifacts and interactive
  Windows and Linux hosts; Apple Silicon is verified and Intel macOS is unsupported.
- [Persist portfolio changes without rewriting on navigation](persistence-write-scope.md): no upstream plan blocker.
- [Track refresh work independently for each repository](refresh-concurrency.md): no upstream plan blocker.

## Phase edges

- All other new phases are independently mergeable; shared files are write collisions, not semantic blockers.
