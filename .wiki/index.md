# Executable plans

| Order | Plan | Difficulty | Impact | Outcome |
|---|---|---|---|---|
| 1 | [tauri-desktop-ingest.md](tauri-desktop-ingest.md) | high | critical | Packaged desktop ingest verification |
| 2 | [linux-release-exports.md](linux-release-exports.md) | medium | high | Verified Debian and AppImage release downloads |
| 3 | [winget-publication.md](winget-publication.md) | medium | high | Windows Package Manager catalog entry |
| 4 | [homebrew-cask-publication.md](homebrew-cask-publication.md) | high | high | Apple Silicon Homebrew cask |
| 5 | [scoop-extra-publication.md](scoop-extra-publication.md) | medium | medium | Scoop Extras manifest and Windows asset |

See [dependency network](plan-network.md) and [execution lanes](parallel-execution.md).

## Portfolio currency review

- 2026-10-29 — Reviewed all executable plans at `9dc909d` against current code, tests,
  documentation, and repository changes since the plans were created in `a0d17bd`. AX-01/02
  and DL-01/02 subsequently landed and their plans were retired. The remaining outcomes at that
  review were current: TD-02 awaits the TD-01 platform matrix; all other recorded prerequisites
  and write-collision lanes remain current.
- 2026-10-30 — Reconciled FH-01 against the working tree after transactional handle cleanup,
  cleanup-failure reporting, and focused browser coverage passed. Retired the completed plan;
  the 2026-10-29 evidence review remains current for the six remaining executable outcomes.
- 2026-10-30 — Reconciled FD-01 against the working tree after modern file-handle and legacy
  directory-drop coverage passed. Retired the completed plan; five executable outcomes remain.
- 2026-10-30 — RP-01/02 completed with lazy document rendering, bounded graph frames, resize
  handling, and focused browser coverage. Evidence is in `docs/rendering-performance.md`;
  four executable outcomes remain. AX-01/02 remain retired after current code and browser
  coverage were checked again.
- 2026-10-30 — RB-01 completed: explicit branch selection resolves slash-containing refs in
  GitHub and GitLab requests and source IDs; unit and browser coverage passed. Retired the plan;
  three executable outcomes remain. The 2026-10-29 portfolio-wide review is still current.
- 2026-10-30 — TD-01/02 completed after the Apple Silicon fallback omitted the hidden `.wiki`
  directory and the scope-checked native Tauri path passed focused tests and packaging. The mounted
  Apple Silicon DMG imported successfully; TD-03 now waits only on Windows and Linux release
  artifacts and interactive hosts. Intel macOS is not supported. Three executable outcomes remain.
- 2026-10-30 — PS-01 completed with revision-gated portfolio persistence and representative
  write-count and latency measurements in `docs/persistence-measurement.md`. Retired the plan;
  two executable outcomes remain.
- 2026-10-30 — RF-01 completed with per-repository controllers and generations, removal
  invalidation, and delayed-overlap browser coverage. Retired the plan and the no-longer-needed
  coordination record; TD-03 is the sole remaining executable outcome.
- 2026-10-30 — Reviewed the full active portfolio at `8e9287a` against the current release
  workflow, Tauri configuration, desktop-ingest record, recent history, and package-manager
  submission rules. TD-03 remains blocked on Windows and Linux interactive hosts and draft
  artifacts. Added four distribution plans: Linux export checks can start now; Scoop and WinGet
  require Windows artifact smoke evidence; Homebrew requires signed, notarized Apple Silicon
  assets and credentials. No existing active phase was completed by these additions.
- 2026-10-30 — LX-01 workflow implementation now explicitly builds and checks the five desktop
  release formats, checks uploaded release assets, and attaches checksums before publishing.
  A tagged draft run remains required to validate actual uploads; LX-01 stays in progress.
