---
type: Plan
title: Make dropped files match the import interface
description: Accept individual Markdown files and folders through one documented import contract, and do not emit a false error after a legacy directory drop.
difficulty: low
impact: medium
package: [okf-plan-browser]
tags: [review, improvement]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Make dropped files match the import interface.

# Current evidence

The home card advertises dropped Markdown files, while useFileSystem.dropFolder only accepts directories. The legacy entry path can still report a folder error after success.

# Boundaries and decisions

Implement only this outcome. Keep unrelated high-impact hardening intact. No external service or storage migration is required by this plan.

# Dependencies

No upstream plan blocker. Shared write sets are serialized in [parallel-execution.md](parallel-execution.md).

# Validation

Run each phase's focused checks, then `npm run typecheck` and `npm run lint`.

# Acceptance criteria

- Accept individual Markdown files and folders through one documented import contract, and do not emit a false error after a legacy directory drop.

# Execution phases

## FD-01 — Accept advertised drop inputs

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `src/hooks/useFileSystem.ts`, `src/components/FolderPicker.tsx`, `src/lib/wikiIngest.test.ts`, `e2e/integrity.spec.ts`
- Primary integration lock: folder ingest
- Outcome: Accept individual Markdown files and folders through one documented import contract, and do not emit a false error after a legacy directory drop.
- Focused validation: npm test -- src/lib/wikiIngest.test.ts; npx playwright test e2e/integrity.spec.ts
- Handoff: Record the verified behavior in tests or durable documentation, prune this phase, and reconcile indexes and lanes. Preserve any unfinished defect as a bounded phase.
