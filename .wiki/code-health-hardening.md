---
type: Plan
title: Code health hardening portfolio
description: Remaining review finding for okf-plan-browser, routed to its executable plan without duplicating the work.
difficulty: high
impact: critical
package: [okf-plan-browser]
tags: [code-health, review, desktop]
status: planned
execution: coordination
---

# Goal

Route the one remaining finding from the full static review to its executable plan. This
record carries the routing only; the work, budget, and validation live in the linked plan.

# Current evidence

Fifteen of the sixteen original findings are resolved in code and tests: the Vitest suite and
CI test step, per-field store selectors, the derived search text, indexed graph link
resolution, lazy routes, CSS panel animation without `framer-motion`, keyboard and dialog
semantics with `eslint-plugin-jsx-a11y`, the error boundary and 404 route, the single
phase-reference matcher, `noUncheckedIndexedAccess`, and the dependency, dead-code, and copy
cleanups. Persistence and list virtualization were measured and not adopted; the evidence is
in `docs/persistence-measurement.md`.

The remaining finding needs packaged builds on Windows, macOS, and Linux, which cannot be
produced in an ordinary development session.

| # | Finding | Impact | Difficulty | Routed to |
|---|---|---|---|---|
| 1 | `src-tauri/src/main.rs` is the bare default with no dialog or fs plugin, so the published desktop builds likely cannot load a wiki | High | Medium | [tauri-desktop-ingest.md](plans/tauri-desktop-ingest.md) |

# Dependencies and stop gates

Sequencing is recorded in [plan-network.md](plan-network.md) and lane assignment in
[parallel-execution.md](parallel-execution.md).

# Decisions

- This record stays a coordination record with no executable phases.
- The finding is retired from the table only when its child plan is deleted.

# Validation

`python3 .agents/skills/planning/scripts/validate_wiki.py .` reports a clean wiki.

# Acceptance criteria

- The finding in the table routes to exactly one existing executable child plan.
- The derived executable count in [index.md](index.md) matches the live plan files.
