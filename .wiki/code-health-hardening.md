---
type: Plan
title: Code health hardening portfolio
description: Ranked review findings for okf-plan-browser, organized into atomic executable plans without duplicating their work.
difficulty: mixed
impact: high
package: [okf-plan-browser]
tags: [code-health, review, quality, performance, accessibility, testing]
status: planned
execution: coordination
---

# Goal

Record the outcome of a full static review of the repository and route every remaining
finding to exactly one atomic executable plan. This record carries the ranking and the
routing only; the work, its budget, and its validation live in the linked plans.

# Current evidence

Verified against the working tree at commit `f723654` on 2026-10-18.

`npm run lint`, `npm run typecheck`, and `npm run build` all pass, so the tree is green
before any plan work begins. `npm run build` reports `index-*.js` at 496.58 kB
(154.76 kB gzip) and `motion-*.js` at 129.86 kB (42.88 kB gzip).

Findings are ordered by impact, then by difficulty within equal impact. Impact is the
product or maintenance consequence of leaving the finding unaddressed; difficulty is the
effort to reach a mergeable result.

| # | Finding | Impact | Difficulty | Routed to |
|---|---|---|---|---|
| 1 | `src/lib/wikiParser.ts` is 288 lines of regex parsing with no tests, no runner, and no `test` script | Very high | Easy | [test-suite.md](plans/test-suite.md) |
| 2 | `src-tauri/src/main.rs` is the bare default with no dialog or fs plugin, so the published desktop builds likely cannot load a wiki | High | Medium | [tauri-desktop-ingest.md](plans/tauri-desktop-ingest.md) |
| 3 | `src/store/planStore.ts:154-163` rebuilds a lowercase haystack per plan on every store write, and the portfolio search writes on each keystroke | High | Easy | [render-performance.md](plans/render-performance.md) |
| 4 | All seven routes, D3, `react-markdown`, and `rehype-highlight` load on first paint; `framer-motion` serves one panel | High | Easy | [bundle-size.md](plans/bundle-size.md) |
| 5 | Six call sites subscribe to the whole store with a bare `usePlanStore()` | High | Easy | [render-performance.md](plans/render-performance.md) |
| 6 | `src/components/DependencyGraph.tsx:51` and `:58-61` resolve links with linear `find` scans inside nested loops | Medium high | Easy | [render-performance.md](plans/render-performance.md) |
| 7 | Interactive behaviour sits on non-interactive elements, and the detail panel is a modal without dialog semantics | Medium high | Medium | [accessibility.md](plans/accessibility.md) |
| 8 | `src/App.tsx` has no catch-all route and no error boundary | Medium | Easy | [resilience-boundaries.md](plans/resilience-boundaries.md) |
| 9 | `ParsedPlan.raw` is written by the parser and blanked at persist time but never read | Medium | Trivial | [dead-code-and-dependencies.md](plans/dead-code-and-dependencies.md) |
| 10 | `@tanstack/react-query` has no imports anywhere in `src/`, yet `src/pages/AboutPage.tsx:20` lists it; `simple-icons` is a devDependency imported by shipped code | Medium | Trivial | [dead-code-and-dependencies.md](plans/dead-code-and-dependencies.md) |
| 11 | The whole portfolio is persisted to `localStorage`, whose ceiling the store already treats as a failure mode | Medium | Medium | [persistence-backend.md](plans/persistence-backend.md) |
| 12 | The `PA-XX` phase-reference matcher is duplicated three times and `noUncheckedIndexedAccess` is off | Medium | Easy | [parser-hardening.md](plans/parser-hardening.md) |
| 13 | `src/components/PlanTable.tsx` and `src/components/KanbanBoard.tsx` render every row and card unvirtualized | Medium | Medium | [list-virtualization.md](plans/list-virtualization.md) |
| 14 | `src/pages/SettingsPage.tsx` ships a `YOUR_USERNAME` link, a hardcoded `v1.0.0`, and a wrong "Vite 5" claim | Low medium | Trivial | [dead-code-and-dependencies.md](plans/dead-code-and-dependencies.md) |
| 15 | `src/hooks/useTheme.ts` is orphaned and `debounce`, `PlanDependency.resolved`, and several Tailwind animations are unused | Low | Trivial | [dead-code-and-dependencies.md](plans/dead-code-and-dependencies.md) |
| 16 | `README.md:65` omits the `waiting-on-validation` status and the project tree misses five source files | Low | Trivial | [dead-code-and-dependencies.md](plans/dead-code-and-dependencies.md) |

# Dependencies and stop gates

Sequencing is recorded in [plan-network.md](plan-network.md) and lane assignment in
[parallel-execution.md](parallel-execution.md). Two stop gates apply to this record:

- Findings 1 and 2 are the only two with product-level consequences, so they lead the
  ranking and gate the phases that depend on measured behaviour.
- Finding 12 is deferred until the runner from [test-suite.md](plans/test-suite.md) can
  demonstrate the matcher refactor preserves behaviour.

# Decisions

- This record stays a coordination record. It carries no executable phases of its own, so
  its ranking must not restate the budget or validation of any linked plan.
- A finding is retired from the table above only when its child plan is deleted under the
  wiki lifecycle rules. The table is not a task list and never carries completed entries.
- Findings 3, 5, and 6 share one child plan because all three reduce recomputation during
  store updates and are validated by the same measurement. Their write sets do not overlap.

# Validation

`python3 .agents/skills/planning/scripts/validate_wiki.py .` reports a clean wiki, and every
row in the table above still resolves to a live child plan file.

# Acceptance criteria

- Every finding in the table routes to exactly one existing executable child plan.
- No finding is implemented here; no child plan duplicates another child's scope.
- The derived executable count in [index.md](index.md) matches the live plan files.