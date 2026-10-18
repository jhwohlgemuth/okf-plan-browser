# Planning portfolio

Planning wiki for `okf-plan-browser`. The portfolio currently contains 10 executable plans and
1 coordination record.

## Entry point

[code-health-hardening.md](code-health-hardening.md) — coordination record carrying the ranked
review findings and the routing from each finding to exactly one executable plan.

## Executable plans

Ordered by impact, then by difficulty within equal impact. Per-phase budget, write set, and
validation live in each plan.

| Order | Plan | Difficulty | Impact | Phases |
|---|---|---|---|---|
| 1 | [plans/test-suite.md](plans/test-suite.md) | medium | critical | 4 |
| 2 | [plans/tauri-desktop-ingest.md](plans/tauri-desktop-ingest.md) | high | critical | 3 |
| 3 | [plans/render-performance.md](plans/render-performance.md) | medium | high | 3 |
| 4 | [plans/bundle-size.md](plans/bundle-size.md) | medium | high | 2 |
| 5 | [plans/accessibility.md](plans/accessibility.md) | medium | high | 3 |
| 6 | [plans/resilience-boundaries.md](plans/resilience-boundaries.md) | low | medium | 1 |
| 7 | [plans/parser-hardening.md](plans/parser-hardening.md) | medium | medium | 2 |
| 8 | [plans/persistence-backend.md](plans/persistence-backend.md) | high | medium | 2 |
| 9 | [plans/list-virtualization.md](plans/list-virtualization.md) | medium | medium | 2 |
| 10 | [plans/dead-code-and-dependencies.md](plans/dead-code-and-dependencies.md) | low | low | 4 |

## Supporting views

- [plans/index.md](plans/index.md) — the executable plan index with outcomes.
- [plan-network.md](plan-network.md) — genuine blockers between plans and between phases.
- [parallel-execution.md](parallel-execution.md) — one primary integration lock per ready
  phase, and the lanes that avoid write-set collisions.

## Conventions

- Executable plans use `execution: phased` with `phase_budget_hours: 5`. Coordination records
  use `execution: coordination` and carry no phases.
- A completed phase is removed from its plan, never marked done. A plan whose acceptance
  criteria hold is deleted along with every reference to it.
- Validate after any change with
  `python3 .agents/skills/planning/scripts/validate_wiki.py .`.