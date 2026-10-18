---
type: Plan
title: A render fault or unknown URL shows a recovery surface
description: Add an application error boundary and a catch-all route so neither a bad URL nor a thrown render blanks the window.
difficulty: low
impact: medium
package: [okf-plan-browser]
tags: [reliability, error-boundary, routing, ux]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Guarantee that no route renders a blank window, whether the cause is an unknown path or a
component throwing while rendering parsed user data.

# Current evidence

`src/App.tsx` declares routes for `/home`, `/portfolio`, `/phases`, `/graph`, `/search`,
`/settings`, and `/about` at lines 31 to 37, plus an index redirect at `:30`. There is no
catch-all path, so any other URL matches no route and `src/components/Layout.tsx:33` renders
an empty `main`.

There is no error boundary anywhere in `src/`. The store's `safeStorage` wrapper at
`src/store/planStore.ts:32-43` already treats storage failure as non-fatal, which sets the
project's expectation that degradation is surfaced rather than thrown. The parser converts
arbitrary user markdown into render data and already collects per-file problems into
`ParseWarning`, so malformed input is a normal, expected condition rather than an exception.

# Boundaries

- No change to route paths or to the redirect at `src/App.tsx:30`.
- The boundary catches render faults. It does not retry parsing or mutate persisted state.

# Dependencies and stop gates

- No upstream blocker.
- Should follow [bundle-size.md](bundle-size.md) so the boundary is not re-instantiated by a
  later change to the route tree.

# Decisions

- One boundary wraps the routed tree inside `src/App.tsx`, so a fault in any page keeps the
  navigation shell and the detail panel alive.
- The fallback offers a reset and a reload rather than a silent retry, because a corrupted
  persisted portfolio would otherwise re-throw on every attempt.
- The not-found route reuses the same presentational shell as the boundary rather than
  introducing a new page style.

# Validation

`npm run typecheck`, `npm run lint`, and `npm run build` pass, and an unknown path and an
injected throw both render a recoverable surface with navigation intact.

# Acceptance criteria

- An unknown URL renders a not-found surface inside the normal application shell.
- A component that throws during render produces a recoverable surface with the sidebar
  still usable.
- Neither surface renders an empty `main`.

# Execution phases

## RB-01 — Error boundary and catch-all route

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: BS-01
- Exact write set: `src/App.tsx`, `src/components/ErrorFallback.tsx`, `src/components/NotFoundPage.tsx`
- Primary integration lock: application entry and chunk graph
- Outcome: An unknown URL renders a not-found surface in the shell, and a component throwing during render renders a recovery surface with reload and reset actions.
- Focused validation: `npm run build` and `npm run typecheck`, then one unknown-path visit and one injected throw
- Handoff: Record the recovery actions offered and the boundary placement, then delete this plan once its criteria hold.