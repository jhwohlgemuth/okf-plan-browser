---
type: Plan
title: Reduce initial loading and graph layout work
description: Replace the synchronous layout burst with bounded incremental work, preserve graph responsiveness and zoom, and recenter or fit after resize.
difficulty: medium
impact: medium
package: [okf-plan-browser]
tags: [review, improvement]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Reduce initial loading and graph layout work.

# Current evidence

The detail panel eagerly imports Markdown and highlighting. The measured production entry chunk before hardening was approximately 449 KB uncompressed. The graph still performs 300 synchronous simulation ticks and does not observe container resize.

# Boundaries and decisions

Implement only this outcome. Keep unrelated high-impact hardening intact. No external service or storage migration is required by this plan.

# Dependencies

No upstream plan blocker. Shared write sets are serialized in [parallel-execution.md](../parallel-execution.md).

# Validation

Run each phase's focused checks, then `npm run typecheck` and `npm run lint`.

# Acceptance criteria

- Lazy-load document rendering and restrict highlighting to useful languages. Record before/after initial transferred JavaScript and first detail-open behavior with a representative large plan.
- Replace the synchronous layout burst with bounded incremental work, preserve graph responsiveness and zoom, and recenter or fit after resize. Benchmark representative node counts before adopting workers or virtualization.

# Execution phases

## RP-01 — Load document rendering on demand

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `src/components/Layout.tsx`, `src/components/PlanDetailPanel.tsx`, `src/components/Markdown.tsx`, `vite.config.ts`, `docs/rendering-performance.md`
- Primary integration lock: rendering performance
- Outcome: Lazy-load document rendering and restrict highlighting to useful languages. Record before/after initial transferred JavaScript and first detail-open behavior with a representative large plan.
- Focused validation: npm run build; npx playwright test e2e/integrity.spec.ts; inspect initial network requests and detail-open fallback
- Handoff: Record the verified behavior in tests or durable documentation, prune this phase, and reconcile indexes and lanes. Preserve any unfinished defect as a bounded phase.

## RP-02 — Bound graph work and respond to resize

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `src/components/DependencyGraph.tsx`, `src/lib/graphLayout.ts`, `src/lib/graphLayout.test.ts`, `e2e/integrity.spec.ts`, `docs/rendering-performance.md`
- Primary integration lock: rendering performance
- Outcome: Replace the synchronous layout burst with bounded incremental work, preserve graph responsiveness and zoom, and recenter or fit after resize. Benchmark representative node counts before adopting workers or virtualization.
- Focused validation: npm test -- src/lib/graphLayout.test.ts; npx playwright test e2e/integrity.spec.ts; record main-thread frame durations
- Handoff: Record the verified behavior in tests or durable documentation, prune this phase, and reconcile indexes and lanes. Preserve any unfinished defect as a bounded phase.
