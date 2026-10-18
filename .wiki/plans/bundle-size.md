---
type: Plan
title: First paint stops downloading the graph, markdown, and animation runtimes
description: Lazy-load the routes and replace the single-use Framer Motion panel with the animation utilities already installed.
difficulty: medium
impact: high
package: [okf-plan-browser]
tags: [performance, bundle, vite, lazy-loading, framer-motion]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Stop the initial page load from fetching code that only three routes need, and reclaim the
animation runtime that a single panel consumes.

# Current evidence

`npm run build` reports `index-*.js` at 496.58 kB (154.76 kB gzip), `motion-*.js` at
129.86 kB (42.88 kB gzip), `vendor-*.js` at 181.35 kB (59.75 kB gzip), `ui-*.js` at
76.49 kB (26.83 kB gzip), `d3-*.js` at 61.43 kB (21.26 kB gzip), and `yaml-*.js` at
44.02 kB (14.83 kB gzip).

`src/App.tsx` imports all seven page components eagerly at lines 4 to 10, so the empty-state
landing screen downloads the D3 graph, the markdown renderer with `rehype-highlight`, and the
`lowlight` grammar set behind it. `framer-motion` is imported in exactly one place,
`src/components/PlanDetailPanel.tsx:3`, for a backdrop fade and a slide-in panel.

`tailwindcss-animate` is already installed and already used by `src/components/ui/dialog.tsx`,
so the CSS-based enter and exit utilities that would replace Framer Motion are present.

# Boundaries

- No visual redesign. The panel must keep its spring slide and backdrop fade.
- No change to router paths, so existing GitHub Pages deep links keep working.
- The `manualChunks` map in `vite.config.ts` is adjusted only where the build proves it
  misleading after splitting.

# Dependencies and stop gates

- No upstream blocker. This plan may start beside [render-performance.md](render-performance.md).
- Requires TS-03 green so the deferred modules stay covered once they load lazily.

# Decisions

- `React.lazy` and `Suspense` are applied at the route elements in `src/App.tsx`, with a
  shared minimal fallback, rather than per page.
- Framer Motion is removed rather than kept for the panel. One consumer does not justify a
  42.88 kB gzip runtime when the animation utilities already ship in the stylesheet.
- Chunk names are left to Vite's automatic splitting after the route split, because the
  current hand-written `manualChunks` list in `vite.config.ts:19-26` names three Radix
  packages while the rest fall into the index chunk.

# Validation

`npm run build` shows a materially smaller entry chunk, and every route in
`src/components/Sidebar.tsx` still renders and still resolves its deep link on GitHub Pages.

# Acceptance criteria

- `framer-motion` is absent from `package.json` and from the build output.
- Each route component is loaded on demand rather than imported at `src/App.tsx` module scope.
- The detail panel keeps its slide-in and backdrop fade.
- All seven routes render correctly from a direct deep link.

# Execution phases

## BS-01 — Lazy-load the route components

- Status: planned
- Budget: 4 hours maximum
- Prerequisites: TS-03
- Exact write set: `src/App.tsx`, `src/components/RouteFallback.tsx`, `vite.config.ts`
- Primary integration lock: application entry and chunk graph
- Outcome: The seven page components load on demand behind a shared fallback, and the build output shows per-route chunks with a smaller entry chunk.
- Focused validation: `npm run build` and `npm run typecheck`
- Handoff: Record the before and after entry-chunk sizes from the build report, then mark BS-02 ready.

## BS-02 — Replace Framer Motion with the installed animation utilities

- Status: planned
- Budget: 4 hours maximum
- Prerequisites: BS-01
- Exact write set: `src/components/PlanDetailPanel.tsx`, `package.json`, `src/index.css`
- Primary integration lock: application entry and chunk graph
- Outcome: The detail panel animates through the Tailwind animation utilities, the `framer-motion` dependency and its chunk are gone, and the panel keeps a spring-like slide-in plus a backdrop fade.
- Focused validation: `npm run build`, then `npm run lint` and `npm run typecheck`
- Handoff: Record the removed chunk size and the keyframe names used, then delete this plan once its criteria hold.