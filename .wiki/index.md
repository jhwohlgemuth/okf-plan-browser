# Executable plans

| Order | Plan | Difficulty | Impact | Outcome |
|---|---|---|---|---|
| 1 | [tauri-desktop-ingest.md](tauri-desktop-ingest.md) | high | critical | Packaged desktop ingest verification |
| 2 | [linux-release-exports.md](linux-release-exports.md) | medium | high | Verified Debian and AppImage release downloads |
| 3 | [planning-skill-web-distribution.md](planning-skill-web-distribution.md) | medium | high | Web-installable planning skill for OpenCode and Codex |
| 4 | [planning-skill-waza-workflow.md](planning-skill-waza-workflow.md) | medium | high | Waza development and behavioral testing for the planning skill |
| 5 | [winget-publication.md](winget-publication.md) | medium | high | Windows Package Manager catalog entry |
| 6 | [homebrew-cask-publication.md](homebrew-cask-publication.md) | high | high | Apple Silicon Homebrew cask |
| 7 | [scoop-extra-publication.md](scoop-extra-publication.md) | medium | medium | Scoop Extras manifest and Windows asset |

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
- 2026-10-30 — Added the planning-skill web distribution outcome after checking the current
  client-generated download, copied prompts, Pages build, plugin absence, and release workflow at
  `3336e28`. PSD-01 is ready; PSD-03 is blocked behind the active LX-01 release-workflow lock.
  No existing phase was completed by this addition; six executable outcomes remain.
- 2026-10-30 — Extended PSD-01 after verifying OpenCode v2's native HTTP catalog contract:
  `index.json`, safe same-origin file paths, and a changed version for cache refresh. This does not
  change phase readiness or the release-workflow lock.
- 2026-10-30 — Added the planning-skill Waza outcome after checking the canonical skill, all 16
  passing validator tests, absent Waza files and local binary, the `my-shell-setup` development
  pattern, and the official v0.39.1 separated-workspace guidance. PWZ-01 is ready; model-backed
  validation remains explicit and credential-dependent. No existing phase completed; seven
  executable outcomes remain.
- 2026-10-30 — LX-01 completed in published `v0.0.1` (run 41144436883): five canonical
  installers and matching checksum sidecars are public. Pruned LX-01; LX-02 and TD-03 now wait
  on interactive Linux and Windows hosts. The release-workflow lock is free for the remaining
  distribution phases.
- 2026-10-30 — PWZ-01 completed in the current worktree: Waza v0.39.1 passed schema, strict
  coverage, preflight, and mock fixture wiring; 16 validator tests passed. PWZ-02/03 await
  authorized model-backed trials; PWZ-04 awaits a GitHub Actions run of the new workflow.
