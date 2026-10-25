---
type: Plan
title: Track refresh work independently for each repository
description: Track each repository operation and generation independently, cancel only intended work, invalidate removed sources, and ensure old responses cannot overwrite a later import or refresh.
difficulty: medium
impact: medium
package: [okf-plan-browser]
tags: [review, improvement]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Track refresh work independently for each repository.

# Current evidence

Remote refresh now supports cancellation and reports original failures, but one controller and one busy set still serve all repositories. Starting another refresh cancels the previous operation; reupload is outside that lifecycle.

# Boundaries and decisions

Implement only this outcome. Keep unrelated high-impact hardening intact. No external service or storage migration is required by this plan.

# Dependencies

No upstream plan blocker. Shared write sets are serialized in [parallel-execution.md](parallel-execution.md).

# Validation

Run each phase's focused checks, then `npm run typecheck` and `npm run lint`.

# Acceptance criteria

- Track each repository operation and generation independently, cancel only intended work, invalidate removed sources, and ensure old responses cannot overwrite a later import or refresh. Preserve specific failures and correct busy indicators.

# Execution phases

## RF-01 — Coordinate refresh and reupload per repository

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `src/hooks/useRefresh.ts`, `src/components/Sidebar.tsx`, `src/lib/commitWiki.ts`, `src/lib/portfolioIntegrity.test.ts`, `e2e/refresh.spec.ts`
- Primary integration lock: refresh lifecycle
- Outcome: Track each repository operation and generation independently, cancel only intended work, invalidate removed sources, and ensure old responses cannot overwrite a later import or refresh. Preserve specific failures and correct busy indicators.
- Focused validation: npm test -- src/lib/portfolioIntegrity.test.ts; npx playwright test e2e/refresh.spec.ts with delayed overlapping responses
- Handoff: Record the verified behavior in tests or durable documentation, prune this phase, and reconcile indexes and lanes. Preserve any unfinished defect as a bounded phase.
