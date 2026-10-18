# Parallel execution

One primary integration lock per phase, and the lanes that can run concurrently. A lane is
safe only when no two ready phases share a file.

## Primary integration locks

| Lock | Phases holding it |
|---|---|
| Desktop application packaging | TD-01, TD-02, TD-03 |
| None, coordination only | [code-health-hardening.md](code-health-hardening.md) |

## Lanes

One lane for [tauri-desktop-ingest.md](plans/tauri-desktop-ingest.md), run in order: TD-01, then TD-02, then TD-03. All three phases hold the desktop
application packaging lock, so they never run concurrently.
