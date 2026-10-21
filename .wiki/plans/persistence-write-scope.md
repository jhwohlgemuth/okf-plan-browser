---
type: Plan
title: Persist portfolio changes without rewriting on navigation
description: Only portfolio mutations serialize and write the saved portfolio.
difficulty: medium
impact: medium
package: [okf-plan-browser]
tags: [review, improvement]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Persist portfolio changes without rewriting on navigation.

# Current evidence

The persisted Zustand store still contains selection and filters. Its partialize callback rebuilds the full plans payload after UI-only updates. Existing size measurements in docs/persistence-measurement.md do not measure interaction write cost.

# Boundaries and decisions

Implement only this outcome. Keep unrelated high-impact hardening intact. No external service or storage migration is required by this plan.

# Dependencies

No upstream plan blocker. Shared write sets are serialized in [parallel-execution.md](../parallel-execution.md).

# Validation

Run each phase's focused checks, then `npm run typecheck` and `npm run lint`.

# Acceptance criteria

- Only portfolio mutations serialize and write the saved portfolio. Measure storage write counts and latency using a representative large portfolio; retain localStorage unless measurements justify migration.

# Execution phases

## PS-01 — Separate transient updates from persistence

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `src/store/planStore.ts`, `src/store/planStore.test.ts`, `src/store/uiStore.ts`, `docs/persistence-measurement.md`
- Primary integration lock: portfolio storage
- Outcome: Only portfolio mutations serialize and write the saved portfolio. Measure storage write counts and latency using a representative large portfolio; retain localStorage unless measurements justify migration.
- Focused validation: npm test -- src/store/planStore.test.ts; npm run typecheck; measure zero storage writes for filter and detail-only changes
- Handoff: Record the verified behavior in tests or durable documentation, prune this phase, and reconcile indexes and lanes. Preserve any unfinished defect as a bounded phase.
