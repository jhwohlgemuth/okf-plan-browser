---
type: Plan
title: One phase-reference matcher and stricter indexed access
description: Collapse the three duplicated PA-XX matchers and enable noUncheckedIndexedAccess, proven by the existing suite.
difficulty: medium
impact: medium
package: [okf-plan-browser]
tags: [parser, regex, typescript, refactor, type-safety]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Reduce the parser to a single definition of a phase reference and let the compiler find the
latent indexed-access assumptions that the current configuration hides.

# Current evidence

The phase-reference pattern appears three times. `REF_RE` is declared at
`src/lib/wikiParser.ts:44` and used once at `:59`, where `parseListPhases` collects
references. `:84` repeats the same pattern inline inside `parsePhases`. `:121` repeats it
again in `extractPhaseRefs` with a `Set` to deduplicate.

`LINK_RE` is declared at `src/lib/wikiParser.ts:107` with the global flag and driven by a
manual `while ((m = LINK_RE.exec(body)) !== null)` loop at `:112`. It is correct only because
a `null` return resets `lastIndex`; any future early return inside that loop would silently
drop every later link in the file.

`tsconfig.json` sets `strict`, `noUnusedLocals`, and `noUnusedParameters` at lines 14 to 16
but leaves `noUncheckedIndexedAccess` off, while the parser indexes into match results and
the ingest path indexes into `webkitRelativePath.split('/')` at
`src/lib/wikiParser.ts:216` and `:219`.

# Boundaries

- No behaviour change. The suite from [test-suite.md](test-suite.md) defines correctness and
  must pass unchanged before and after each phase.
- No new parser capability and no new file format.
- Any defect the suite exposes becomes a repair phase, not an edit to this plan's scope.

# Dependencies and stop gates

- Requires TS-04, because the matcher consolidation is only safe once current behaviour is
  pinned by the full suite including the ingest paths.

# Decisions

- The three inline matchers collapse into the existing `REF_RE` declaration rather than a new
  helper, keeping one literal definition of the pattern in the file.
- `LINK_RE` moves to a `matchAll` call, which does not share mutable state, removing the
  `lastIndex` hazard entirely.
- `noUncheckedIndexedAccess` is enabled and its fallout resolved within scope. If a finding
  proves a real latent bug, it is recorded as evidence and repaired in its own phase.

# Validation

`npm run test` passes before and after both phases with no expectation edits, and
`npm run typecheck` is clean with the stricter flag enabled.

# Acceptance criteria

- The phase-reference pattern is declared exactly once in `src/lib/wikiParser.ts`.
- No global-flag module-level regex is driven by a manual `exec` loop.
- `noUncheckedIndexedAccess` is enabled in `tsconfig.json` and `npm run typecheck` passes.

# Execution phases

## PH-01 — Collapse the duplicated phase-reference matchers

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: TS-04
- Exact write set: `src/lib/wikiParser.ts`
- Primary integration lock: wiki parser output contract
- Outcome: `parseListPhases`, `parsePhases`, and `extractPhaseRefs` all read the single matcher declaration, and `extractDependencies` uses `matchAll` instead of a shared `exec` loop, with every existing test still green.
- Focused validation: `npm run test src/lib/wikiParser.test.ts src/lib/wikiPhases.test.ts`
- Handoff: Record the before and after reference lists for the phase fixtures, then mark PH-02 ready.

## PH-02 — Enable stricter indexed access

- Status: planned
- Budget: 5 hours maximum
- Prerequisites: PH-01
- Exact write set: `tsconfig.json`, `src/lib/wikiParser.ts`, `src/lib/demoData.ts`, `src/lib/names.ts`
- Primary integration lock: TypeScript compiler configuration
- Outcome: `noUncheckedIndexedAccess` is on in `tsconfig.json`, `npm run typecheck` passes, and each newly surfaced undefined-index site is either narrowed or recorded as a confirmed latent defect for a repair phase.
- Focused validation: `npm run typecheck` and `npm run test`
- Handoff: Record the count and nature of sites the flag surfaced, then delete this plan once its criteria hold.