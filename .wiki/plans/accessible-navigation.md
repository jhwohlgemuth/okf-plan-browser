---
type: Plan
title: Make navigation and graph usable without a pointer
description: Add labeled focusable node activation, zoom/reset controls and a textual dependency/reference list using the shared resolver.
difficulty: medium
impact: medium
package: [okf-plan-browser]
tags: [review, improvement]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Make navigation and graph usable without a pointer.

# Current evidence

The mobile sidebar is translated off-screen rather than removed from the focus order. It has no modal focus management. D3 nodes have click handlers but no keyboard activation; graph information has no textual alternative.

# Boundaries and decisions

Implement only this outcome. Keep unrelated high-impact hardening intact. No external service or storage migration is required by this plan.

# Dependencies

No upstream plan blocker. Shared write sets are serialized in [parallel-execution.md](../parallel-execution.md).

# Validation

Run each phase's focused checks, then `npm run typecheck` and `npm run lint`.

# Acceptance criteria

- Use dialog semantics and focus management for the mobile drawer, restore focus on close, support Escape, and exclude hidden controls from keyboard navigation without altering desktop collapse behavior.
- Add labeled focusable node activation, zoom/reset controls and a textual dependency/reference list using the shared resolver. Verify keyboard access and meaningful light/dark styling.

# Execution phases

## AX-01 — Provide an accessible mobile drawer

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `src/components/Layout.tsx`, `src/components/Sidebar.tsx`, `e2e/sidebar.spec.ts`
- Primary integration lock: navigation accessibility
- Outcome: Use dialog semantics and focus management for the mobile drawer, restore focus on close, support Escape, and exclude hidden controls from keyboard navigation without altering desktop collapse behavior.
- Focused validation: npx playwright test e2e/sidebar.spec.ts on desktop, tablet, and phone with keyboard assertions
- Handoff: Record the verified behavior in tests or durable documentation, prune this phase, and reconcile indexes and lanes. Preserve any unfinished defect as a bounded phase.

## AX-02 — Provide keyboard graph exploration

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `src/components/DependencyGraph.tsx`, `src/pages/GraphPage.tsx`, `src/lib/planLinks.ts`, `e2e/integrity.spec.ts`
- Primary integration lock: navigation accessibility
- Outcome: Add labeled focusable node activation, zoom/reset controls and a textual dependency/reference list using the shared resolver. Verify keyboard access and meaningful light/dark styling.
- Focused validation: npx playwright test e2e/integrity.spec.ts; npm run lint; manual screen-reader check
- Handoff: Record the verified behavior in tests or durable documentation, prune this phase, and reconcile indexes and lanes. Preserve any unfinished defect as a bounded phase.
