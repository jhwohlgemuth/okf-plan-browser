# Planning portfolio

Planning wiki for `okf-plan-browser`. The portfolio currently contains 1 executable plan and
1 coordination record.

## Entry point

[code-health-hardening.md](code-health-hardening.md) — coordination record carrying the
remaining review finding and its routing to an executable plan.

## Executable plans

| Order | Plan | Difficulty | Impact | Phases |
|---|---|---|---|---|
| 1 | [plans/tauri-desktop-ingest.md](plans/tauri-desktop-ingest.md) | high | critical | 3 |

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
