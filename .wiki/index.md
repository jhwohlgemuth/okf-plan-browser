# Executable plans

The coordination record for these outcomes is [code-health-hardening.md](code-health-hardening.md).

| Order | Plan | Difficulty | Impact | Outcome |
|---|---|---|---|---|
| 1 | [tauri-desktop-ingest.md](tauri-desktop-ingest.md) | high | critical | Packaged desktop ingest verification |
| 2 | [Persist portfolio changes without rewriting on navigation](persistence-write-scope.md) | medium | medium | Persist portfolio changes without rewriting on navigation |
| 3 | [Track refresh work independently for each repository](refresh-concurrency.md) | medium | medium | Track refresh work independently for each repository |

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
