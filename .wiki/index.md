# Executable plans

The coordination record for these outcomes is [code-health-hardening.md](code-health-hardening.md).

| Order | Plan | Difficulty | Impact | Outcome |
|---|---|---|---|---|
| 1 | [tauri-desktop-ingest.md](tauri-desktop-ingest.md) | high | critical | Packaged desktop ingest verification |
| 2 | [Make dropped files match the import interface](folder-drop-contract.md) | low | medium | Make dropped files match the import interface |
| 3 | [Forget folder access when removing saved data](forget-folder-handles.md) | low | medium | Forget folder access when removing saved data |
| 4 | [Persist portfolio changes without rewriting on navigation](persistence-write-scope.md) | medium | medium | Persist portfolio changes without rewriting on navigation |
| 5 | [Track refresh work independently for each repository](refresh-concurrency.md) | medium | medium | Track refresh work independently for each repository |
| 6 | [Load branches containing slashes unambiguously](remote-branch-selection.md) | medium | medium | Load branches containing slashes unambiguously |
| 7 | [Restore and share selected plans and phases](plan-deep-links.md) | medium | medium | Restore and share selected plans and phases |
| 8 | [Reduce initial loading and graph layout work](rendering-performance.md) | medium | medium | Reduce initial loading and graph layout work |

See [dependency network](plan-network.md) and [execution lanes](parallel-execution.md).

## Portfolio currency review

- 2026-10-29 — Reviewed all executable plans at `9dc909d` against current code, tests,
  documentation, and repository changes since the plans were created in `a0d17bd`. AX-01/02
  subsequently landed and their plan was retired. The remaining eight outcomes are still
  current: TD-02 awaits the TD-01 platform matrix and DL-02 awaits DL-01; all other recorded
  prerequisites and write-collision lanes remain current.
