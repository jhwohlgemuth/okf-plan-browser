---
type: Plan
title: Remaining app improvements
description: Route the five medium-impact recommendations and existing desktop verification to bounded executable plans.
difficulty: mixed
impact: high
package: [okf-plan-browser]
tags: [review, coordination]
status: planned
execution: coordination
---

# Goal

Keep remaining work discoverable without duplicating executable phase definitions.

# Current evidence

The high-impact implementation is documented in [review-hardening.md](../docs/review-hardening.md).
Desktop source now implements credential and bounded network commands; it is not a bare shell.
Packaged folder ingest still requires platform evidence. Browser behavioral checks and native
unit tests are release gates, but do not substitute for installer interaction tests.

# Remaining outcomes

- [Make dropped files match the import interface](folder-drop-contract.md)
- [Persist portfolio changes without rewriting on navigation](persistence-write-scope.md)
- [Track refresh work independently for each repository](refresh-concurrency.md)
- [Load branches containing slashes unambiguously](remote-branch-selection.md)
- [Reduce initial loading and graph layout work](rendering-performance.md)
- [Verify packaged desktop ingest](tauri-desktop-ingest.md)

# Dependencies

See [plan-network.md](plan-network.md) and [parallel-execution.md](parallel-execution.md).

# Acceptance criteria

Every remaining outcome has one executable plan, and root/nearest indexes, blockers, and lanes agree.

# Validation

`python3 .agents/skills/planning/scripts/validate_wiki.py .`
