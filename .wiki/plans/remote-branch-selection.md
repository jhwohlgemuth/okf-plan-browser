---
type: Plan
title: Load branches containing slashes unambiguously
description: Offer a branch/ref field that overrides URL inference, preserve slash-containing refs in API requests and identity, and explain ambiguity for tree/blob URLs with additional path segments.
difficulty: medium
impact: medium
package: [okf-plan-browser]
tags: [review, improvement]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Load branches containing slashes unambiguously.

# Current evidence

Remote IDs include forge, host, project, and resolved ref, but parseRemoteSpec still takes one segment from tree/blob URLs. feature/new-ui therefore becomes feature.

# Boundaries and decisions

Implement only this outcome. Keep unrelated high-impact hardening intact. No external service or storage migration is required by this plan.

# Dependencies

No upstream plan blocker. Shared write sets are serialized in [parallel-execution.md](../parallel-execution.md).

# Validation

Run each phase's focused checks, then `npm run typecheck` and `npm run lint`.

# Acceptance criteria

- Offer a branch/ref field that overrides URL inference, preserve slash-containing refs in API requests and identity, and explain ambiguity for tree/blob URLs with additional path segments.

# Execution phases

## RB-01 — Expose an explicit branch override

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `src/lib/remoteWiki.ts`, `src/lib/remoteWiki.test.ts`, `src/hooks/useFileSystem.ts`, `src/components/FolderPicker.tsx`, `e2e/integrity.spec.ts`
- Primary integration lock: remote source selection
- Outcome: Offer a branch/ref field that overrides URL inference, preserve slash-containing refs in API requests and identity, and explain ambiguity for tree/blob URLs with additional path segments.
- Focused validation: npm test -- src/lib/remoteWiki.test.ts; npx playwright test e2e/integrity.spec.ts
- Handoff: Record the verified behavior in tests or durable documentation, prune this phase, and reconcile indexes and lanes. Preserve any unfinished defect as a bounded phase.
