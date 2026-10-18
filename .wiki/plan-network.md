# Dependency network

Genuine blockers only. A shared file is a write collision, not a blocker, and is recorded in
[parallel-execution.md](parallel-execution.md) instead.

## Plan level

[code-health-hardening.md](code-health-hardening.md) is the coordination record and blocks no
plan.

| Plan | Blocked by | Why the blocker is genuine |
|---|---|---|
| [tauri-desktop-ingest.md](plans/tauri-desktop-ingest.md) | none | No upstream blocker |

## Phase level

| Phase | Blocked by | Why the blocker is genuine |
|---|---|---|
| TD-01 | none | Needs packaged builds on Windows, macOS, and Linux |
| TD-02 | TD-01 | The per-platform matrix decides whether the shell is kept or retired |
| TD-03 | TD-02 | The release smoke step needs the new build |
