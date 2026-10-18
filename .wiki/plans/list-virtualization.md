---
type: Plan
title: Long portfolios render a window of rows and cards
description: Virtualize the portfolio table and the phase board so render cost no longer scales with the filtered result count.
difficulty: medium
impact: medium
package: [okf-plan-browser]
tags: [performance, virtualization, react, table, kanban]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Keep the portfolio table and the phase board responsive when a wiki yields thousands of
plans or phases, by rendering only what fits the viewport.

# Current evidence

`src/components/PlanTable.tsx:95` maps the entire sorted result into a `tbody`, one `tr` per
plan. `src/components/KanbanBoard.tsx:74` maps every phase card in each of the five columns
at `:55`. Neither is windowed, and neither paginates.

Both components already receive a filtered slice rather than the full portfolio:
`src/components/PlanTable.tsx:47` and `src/components/KanbanBoard.tsx:33` both read
`selectFilteredPlans` through `useShallow`. That makes a stable, deterministic row order
available to a virtualizer, since `sortPlans` at `src/components/PlanTable.tsx:17` produces
a stable order before render.

No virtualization library is present in `package.json`.

# Boundaries

- No change to filtering, sorting, or the columns and columns' contents.
- No change to the sticky table header at `src/components/PlanTable.tsx:83`.
- No pagination controls; virtualization only.

# Dependencies and stop gates

- Requires RP-02, so the filtered slice is stable and cheap to recompute before it is
  windowed.
- Requires RP-03 to land first if the phase board is virtualized after the table, to avoid two
  open changes in the same render path.

# Decisions

- Windowing is applied to the table first because it has one uniform row height and a stable
  sort order, which is the simpler of the two cases.
- The board is virtualized per column rather than across the board, because each column has
  its own scroll container at `src/components/KanbanBoard.tsx:68`.
- Render cost is measured before and after in each phase, so a portfolio size that does not
  need windowing leaves the plan retirable instead of carrying the complexity.

# Validation

`npm run typecheck` and `npm run lint` pass, and scroll and sort behaviour is unchanged on a
generated large portfolio while the rendered row count stays bounded.

# Acceptance criteria

- The portfolio table and the phase board render a bounded window of items.
- Scrolling, sorting, and row selection behave identically to the unvirtualized version.
- A recorded before and after render measurement shows the improvement.

# Execution phases

## LV-01 — Measure and virtualize the portfolio table

- Status: planned
- Budget: 5 hours maximum
- Prerequisites: RP-02
- Exact write set: `package.json`, `src/components/PlanTable.tsx`
- Primary integration lock: portfolio table render path
- Outcome: A recorded before and after measurement on a generated large portfolio, and the table renders only its visible rows with the sticky header and sort headers unchanged.
- Focused validation: `npm run typecheck` and a manual scroll and sort pass on a generated portfolio
- Handoff: Record the row counts and the measured render time, then mark LV-02 ready.

## LV-02 — Virtualize the phase board columns

- Status: planned
- Budget: 5 hours maximum
- Prerequisites: LV-01
- Exact write set: `src/components/KanbanBoard.tsx`
- Primary integration lock: phase board render path
- Outcome: Each of the five columns renders only its visible cards, and card click, impact dot, priority badge, repository pill, and reference footer are unchanged.
- Focused validation: `npm run typecheck` and a manual scroll and select pass across all five columns
- Handoff: Record the window size per column and the measured render time, then delete this plan once its criteria hold.