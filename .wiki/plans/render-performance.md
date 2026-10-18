---
type: Plan
title: Store updates stop re-filtering and re-rendering unchanged trees
description: Replace whole-store subscriptions, precompute the search haystack once, and index graph link lookups.
difficulty: medium
impact: high
package: [okf-plan-browser]
tags: [performance, zustand, selectors, memoization, d3]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Stop every store write from re-filtering the whole portfolio and re-rendering every
subscribed component, so typing in search stays responsive on a large wiki.

# Current evidence

Six call sites use the bare `usePlanStore()`, which returns the entire state object and
re-renders the subscriber on any change: `src/components/FilterBar.tsx:43`,
`src/hooks/useFileSystem.ts:25`, `src/components/PlanDetailPanel.tsx:18`,
`src/pages/HomePage.tsx:8`, `src/pages/SettingsPage.tsx:16`, and
`src/pages/PortfolioPage.tsx:11`. `PlanDetailPanel` is the most costly of these because
`src/components/Layout.tsx:37` mounts it on every route.

`selectFilteredPlans` at `src/store/planStore.ts:154-163` builds a lowercase haystack per
plan by joining every section heading, every section body, and every phase title. That work
runs on each invocation. `src/pages/PortfolioPage.tsx:29` writes to the store on every
keystroke through `setFilter('search', ...)`, and `PlanTable`, `KanbanBoard`,
`PortfolioPage`, and `PhasesPage` all call the selector through `useShallow`, so the join
repeats per keystroke across all four consumers.

`src/components/DependencyGraph.tsx:51` resolves each dependency with `plans.find` inside a
loop over plans and dependencies, and `:58-61` repeats a nested `find` with a `some` over
every section and phase for each phase reference. `debounce` already exists at
`src/lib/utils.ts:24` and has no importer.

# Boundaries

- No change to filter semantics or to the shape of the persisted state.
- No list virtualization here; that is [list-virtualization.md](list-virtualization.md).
- No parser change; the haystack is derived from already-parsed sections.

# Dependencies and stop gates

- Requires TS-03 so the selector behaviour is pinned before it is optimized.
- RP-02 must land before RP-03 only for shared-file reasons; both stay independently
  mergeable, and the lanes are separated in [parallel-execution.md](../parallel-execution.md).

# Decisions

- The haystack is computed once per plan at parse time and stored alongside the parsed data
  rather than recomputed in the selector. A selector that recomputes derived text on every
  read cannot be made cheap by memoization alone, because it still runs per store write.
- Subscription fixes use per-field selectors. `useShallow` over the whole store is rejected
  because it keeps the re-render, only hiding the warning.
- Debounce is applied to the search term at the input boundary, not inside the store, so the
  store stays the single source of truth for the committed value.

# Validation

`npm run test` stays green, and a filter or search keystroke no longer re-renders
`PlanDetailPanel` or recomputes the haystack for unchanged plans.

# Acceptance criteria

- No bare `usePlanStore()` call remains in `src/`.
- The haystack is built once per plan and never rebuilt during a keystroke.
- Graph link resolution uses a map lookup rather than a linear scan inside a loop.
- Filter results are byte-identical to the current behaviour for the same input.

# Execution phases

## RP-01 — Replace whole-store subscriptions

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: TS-03
- Exact write set: `src/components/FilterBar.tsx`, `src/components/PlanDetailPanel.tsx`, `src/hooks/useFileSystem.ts`, `src/pages/HomePage.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/PortfolioPage.tsx`
- Primary integration lock: plan store selector contract
- Outcome: Each of the six call sites subscribes only to the fields it reads, so an unrelated store write no longer re-renders it.
- Focused validation: `npm run test src/store/planStore.test.ts` and `npm run typecheck`
- Handoff: Record the selector chosen at each call site, then mark RP-02 ready.

## RP-02 — Precompute the search haystack

- Status: planned
- Budget: 5 hours maximum
- Prerequisites: RP-01
- Exact write set: `src/store/planStore.ts`, `src/lib/wikiParser.ts`, `src/types/wiki.ts`, `src/components/PlanTable.tsx`, `src/lib/utils.ts`
- Primary integration lock: plan store selector contract
- Outcome: The searchable text is derived once when a plan is parsed and stored with it, the selector reads it without building strings, and the portfolio search input debounces its writes through the existing `debounce` helper.
- Focused validation: `npm run test src/store/planStore.test.ts`
- Handoff: Record the field name and the debounce interval, then mark RP-03 ready.

## RP-03 — Index dependency graph link resolution

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: RP-02
- Exact write set: `src/components/DependencyGraph.tsx`
- Primary integration lock: dependency graph layout
- Outcome: Node lookup uses a map from file name to plan and from phase id to plan built once per render, removing the nested linear scans at the current lines 51 and 58 to 61.
- Focused validation: `npm run typecheck` and `npm run lint`
- Handoff: Record the node count and link count for the demo portfolio so the graph page header stays verifiable, then delete this plan once its criteria hold.