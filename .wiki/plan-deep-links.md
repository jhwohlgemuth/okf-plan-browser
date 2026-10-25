---
type: Plan
title: Restore and share selected plans and phases
description: Give headings stable anchors; phase cards and Markdown fragments select and focus the corresponding section.
difficulty: medium
impact: medium
package: [okf-plan-browser]
tags: [review, improvement]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Restore and share selected plans and phases.

# Current evidence

Plan selection is transient Zustand state. Phase cards select only their parent plan, and Markdown fragment links are rendered as spans. The shared plan resolver now preserves repository and relative path identity.

# Boundaries and decisions

Implement only this outcome. Keep unrelated high-impact hardening intact. No external service or storage migration is required by this plan.

# Dependencies

No upstream plan blocker. Shared write sets are serialized in [parallel-execution.md](parallel-execution.md).

DL-02 requires DL-01 URL selection support.

# Validation

Run each phase's focused checks, then `npm run typecheck` and `npm run lint`.

# Acceptance criteria

- Represent the selected plan in URL parameters, restore it after reload, support Back and Forward, and gracefully handle links to portfolios not loaded on this machine.
- Give headings stable anchors; phase cards and Markdown fragments select and focus the corresponding section. Preserve anchor state through the URL and history.

# Execution phases

## DL-01 — Put selected plans in the URL

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `src/App.tsx`, `src/components/Layout.tsx`, `src/components/PlanDetailPanel.tsx`, `src/store/planStore.ts`, `e2e/integrity.spec.ts`
- Primary integration lock: selection routing
- Outcome: Represent the selected plan in URL parameters, restore it after reload, support Back and Forward, and gracefully handle links to portfolios not loaded on this machine.
- Focused validation: npx playwright test e2e/integrity.spec.ts with reload and history assertions
- Handoff: Record the verified behavior in tests or durable documentation, prune this phase, and reconcile indexes and lanes. Preserve any unfinished defect as a bounded phase.

## DL-02 — Navigate directly to phase anchors

- Status: blocked
- Budget: 5 active hours maximum
- Prerequisites: DL-01
- Exact write set: `src/components/Markdown.tsx`, `src/components/PlanDetailPanel.tsx`, `src/components/KanbanBoard.tsx`, `src/lib/planLinks.ts`, `src/lib/portfolioIntegrity.test.ts`, `e2e/integrity.spec.ts`
- Primary integration lock: selection routing
- Outcome: Give headings stable anchors; phase cards and Markdown fragments select and focus the corresponding section. Preserve anchor state through the URL and history.
- Focused validation: npm test -- src/lib/portfolioIntegrity.test.ts; npx playwright test e2e/integrity.spec.ts
- Handoff: Record the verified behavior in tests or durable documentation, prune this phase, and reconcile indexes and lanes. Preserve any unfinished defect as a bounded phase.
