---
type: Plan
title: Forget folder access when removing saved data
description: Repository removal deletes its handle; clearing saved data clears all handles.
difficulty: low
impact: medium
package: [okf-plan-browser]
tags: [review, improvement]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Forget folder access when removing saved data.

# Current evidence

deleteHandle and clearHandles are defined but removal and clear actions do not call them. The IndexedDB helper also leaves connections open and resolves requests before transaction completion.

# Boundaries and decisions

Implement only this outcome. Keep unrelated high-impact hardening intact. No external service or storage migration is required by this plan.

# Dependencies

No upstream plan blocker. Shared write sets are serialized in [parallel-execution.md](../parallel-execution.md).

# Validation

Run each phase's focused checks, then `npm run typecheck` and `npm run lint`.

# Acceptance criteria

- Repository removal deletes its handle; clearing saved data clears all handles. Resolve writes on transaction completion, close connections, and surface cleanup failures.

# Execution phases

## FH-01 — Clean up folder handles transactionally

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `src/lib/handleStore.ts`, `src/store/planStore.ts`, `src/store/planStore.test.ts`, `src/pages/SettingsPage.tsx`, `e2e/refresh.spec.ts`
- Primary integration lock: portfolio storage
- Outcome: Repository removal deletes its handle; clearing saved data clears all handles. Resolve writes on transaction completion, close connections, and surface cleanup failures.
- Focused validation: npm test -- src/store/planStore.test.ts; npx playwright test e2e/refresh.spec.ts
- Handoff: Record the verified behavior in tests or durable documentation, prune this phase, and reconcile indexes and lanes. Preserve any unfinished defect as a bounded phase.
