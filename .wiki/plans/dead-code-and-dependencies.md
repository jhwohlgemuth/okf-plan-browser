---
type: Plan
title: No unused dependency, orphaned module, or stale shipped string remains
description: Drop the undeclared-in-code dependency, the write-only field, the orphaned hook, and the placeholder text shipped in the interface.
difficulty: low
impact: low
package: [okf-plan-browser]
tags: [cleanup, dependencies, dead-code, documentation, consistency]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Remove what the tree no longer uses and correct what the interface claims about the project,
so the shipped app does not assert anything untrue about itself.

# Current evidence

`@tanstack/react-query` is declared at `package.json:31` and has no import anywhere in `src/`,
yet `src/pages/AboutPage.tsx:20` lists TanStack Query in the "Built with" section presented to
users. `simple-icons` is a `devDependency` at `package.json:64` but is imported by shipped
code at `src/pages/AboutPage.tsx:6`.

`ParsedPlan.raw` is declared at `src/types/wiki.ts:53`, populated with the full file text at
`src/lib/wikiParser.ts:139`, and blanked before persisting at `src/store/planStore.ts:135`.
No component reads it, so it only duplicates the markdown already held in each section body.

`src/hooks/useTheme.ts` is an orphaned hook: nothing imports it, and both `src/main.tsx:8`
and `src/App.tsx:17-24` perform the theme synchronization inline. `PlanDependency.resolved`
at `src/types/wiki.ts:46` is declared and never assigned or read. `tailwind.config.js`
declares a `container` block at `:8-12` and `accordion-down`, `accordion-up`,
`slide-in-right`, `slide-out-right`, and `fade-in` at `:54-67`, none of which any class in
`src/` references.

`src/pages/SettingsPage.tsx:151` hardcodes `v1.0.0` while `scripts/sync-version.mjs` exists
to keep versions in step. `src/pages/SettingsPage.tsx:156` links to
`https://github.com/YOUR_USERNAME/okf-plan-browser`, a placeholder that resolves nowhere.
`src/pages/SettingsPage.tsx:153` claims `Vite 5` on a project pinned to Vite 6 at
`package.json:66`. `README.md:65` documents `status: planned | in-progress | blocked` and
omits `waiting-on-validation`, which `src/types/wiki.ts:3` and
`src/components/FilterBar.tsx:6` both support. The README project tree at `README.md:129-170`
omits `Markdown.tsx`, `LoadingOverlay.tsx`, `AboutPage.tsx`, `names.ts`, and `useTheme.ts`.

# Boundaries

- No behaviour change. Every phase here must leave `npm run build`, `npm run lint`, and
  `npm run typecheck` green.
- `debounce` at `src/lib/utils.ts:24` is deliberately retained; RP-02 adopts it.
- No new documentation beyond correcting what already exists.

# Dependencies and stop gates

- No upstream blocker.
- DC-02 and DC-03 both touch `src/types/wiki.ts`, so the lanes in
  [parallel-execution.md](../parallel-execution.md) must not run them concurrently.

# Decisions

- The About page tech list is derived from the real dependency set rather than maintained by
  hand, so the claim cannot drift again.
- The Settings version comes from the build rather than a literal, reusing the mechanism in
  `scripts/sync-version.mjs` rather than adding a second one.
- `src/hooks/useTheme.ts` is deleted rather than adopted, because `src/App.tsx` already owns
  the media-query listener and merging the two would duplicate it.

# Validation

`npm run lint`, `npm run typecheck`, and `npm run build` pass after every phase, the About and
Settings pages render no stale claim, and `README.md` matches the tree.

# Acceptance criteria

- `package.json` declares only dependencies the tree imports, and `simple-icons` is a runtime
  dependency.
- No unread field, orphaned module, or unreferenced Tailwind utility remains.
- The Settings page shows the real version and a working repository link.
- `README.md` documents the `waiting-on-validation` status and lists every source file.

# Execution phases

## DC-01 — Reconcile declared dependencies with the real import graph

- Status: planned
- Budget: 2 hours maximum
- Prerequisites: none
- Exact write set: `package.json`, `src/pages/AboutPage.tsx`
- Primary integration lock: dependency manifest
- Outcome: `@tanstack/react-query` is removed from `package.json`, `simple-icons` is a runtime dependency, and the About page "Built with" list reflects only what the tree imports.
- Focused validation: `npm run build` and `npm run typecheck`
- Handoff: Record the removed package and the corrected tech list, then mark DC-02 ready.

## DC-02 — Drop the write-only raw plan field

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: DC-01
- Exact write set: `src/types/wiki.ts`, `src/lib/wikiParser.ts`, `src/store/planStore.ts`
- Primary integration lock: persisted plan data shape
- Outcome: `ParsedPlan.raw` no longer exists, the parser stops retaining a second copy of each file's markdown, and `partialize` no longer blanks a field, with the persisted portfolio still reloading correctly.
- Focused validation: `npm run test` and `npm run typecheck`
- Handoff: Record the removal and confirm the persisted shape change is compatible with the stored version, then mark DC-03 ready.

## DC-03 — Remove orphaned source and unreferenced theme configuration

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: DC-02
- Exact write set: `src/hooks/useTheme.ts`, `src/types/wiki.ts`, `tailwind.config.js`
- Primary integration lock: none; deletion only
- Outcome: The orphaned theme hook, the never-assigned `PlanDependency.resolved` field, and the unreferenced `container` and keyframe configuration are gone, with the rendered stylesheet unchanged for every class in use.
- Focused validation: `npm run build` and `npm run typecheck`
- Handoff: Record the deleted paths and confirm no rendered class disappeared, then mark DC-04 ready.

## DC-04 — Correct shipped copy and the README

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: DC-03
- Exact write set: `src/pages/SettingsPage.tsx`, `README.md`
- Primary integration lock: none; copy only
- Outcome: The Settings page reads its version from the build, links to the real repository, and names the correct Vite version, and `README.md` documents the `waiting-on-validation` status and lists every file in the source tree.
- Focused validation: `npm run build` and a rendered check of the Settings page
- Handoff: Record the version source and the README corrections, then delete this plan once its criteria hold.