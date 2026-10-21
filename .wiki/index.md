# Planning portfolio

The portfolio contains 9 executable plans and 1 coordination record. The seven high-impact
review recommendations are implemented; durable behavior and validation are described in
[review-hardening.md](../docs/review-hardening.md). The eight remaining recommendations and
the pre-existing desktop ingest verification are tracked below.

## Executable plans

Ranked by impact descending, then difficulty ascending.

| Order | Plan | Difficulty | Impact | Outcome |
|---|---|---|---|---|
| 1 | [tauri-desktop-ingest.md](plans/tauri-desktop-ingest.md) | high | critical | Packaged desktop ingest verification |
| 2 | [Make dropped files match the import interface](plans/folder-drop-contract.md) | low | medium | Make dropped files match the import interface |
| 3 | [Forget folder access when removing saved data](plans/forget-folder-handles.md) | low | medium | Forget folder access when removing saved data |
| 4 | [Persist portfolio changes without rewriting on navigation](plans/persistence-write-scope.md) | medium | medium | Persist portfolio changes without rewriting on navigation |
| 5 | [Track refresh work independently for each repository](plans/refresh-concurrency.md) | medium | medium | Track refresh work independently for each repository |
| 6 | [Load branches containing slashes unambiguously](plans/remote-branch-selection.md) | medium | medium | Load branches containing slashes unambiguously |
| 7 | [Make navigation and graph usable without a pointer](plans/accessible-navigation.md) | medium | medium | Make navigation and graph usable without a pointer |
| 8 | [Restore and share selected plans and phases](plans/plan-deep-links.md) | medium | medium | Restore and share selected plans and phases |
| 9 | [Reduce initial loading and graph layout work](plans/rendering-performance.md) | medium | medium | Reduce initial loading and graph layout work |

## Supporting views

- [code-health-hardening.md](code-health-hardening.md) routes remaining findings.
- [plans/index.md](plans/index.md) is the nearest executable index.
- [plan-network.md](plan-network.md) lists actual prerequisites.
- [parallel-execution.md](parallel-execution.md) records integration locks and write collisions.

Validate changes with `python3 .agents/skills/planning/scripts/validate_wiki.py .`.
