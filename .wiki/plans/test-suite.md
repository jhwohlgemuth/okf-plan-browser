---
type: Plan
title: Test suite for the parser, ingest paths, and store selectors
description: A committed test runner in CI covering the wiki parser, all three folder-ingest paths, and the plan-store selectors.
difficulty: medium
impact: critical
package: [okf-plan-browser]
tags: [testing, vitest, parser, ci, quality]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Make `src/lib/wikiParser.ts`, the three ingest paths in the same file, and the selectors in
`src/store/planStore.ts` verifiable in CI, so later parser and performance work can be
proven behaviour-preserving instead of argued by inspection.

# Current evidence

`src/lib/wikiParser.ts` is 288 lines and carries the entire correctness surface of the app:
frontmatter extraction, section splitting, phase detection through `PHASE_ID_RE`,
`STATUS_RE`, and `LIST_ITEM_RE`, dependency links, and the `PA-XX` reference matcher.
Phase titles are derived by splitting on `(?<=[.;:])\s` at `wikiParser.ts:53`, and status
values are normalized through `normalizeStatus` at `wikiParser.ts:64`, so several silent
behaviour changes are reachable by a one-line regex edit.

Three separate ingest implementations exist — `parseWikiFolder`, `parseWikiFileList`, and
`parseWikiEntry` — each reimplementing the same `isPlanFile` then `parseWikiFile` sequence.
A divergence between them would only appear at runtime, on user files.

`package.json` has no `test` script and no test runner. `.github/workflows/ci.yml` runs
`npm run lint`, `npm run typecheck`, and `npm run build` only. `npm run lint`,
`npm run typecheck`, and `npm run build` all pass today, so the baseline is green.

# Boundaries

- Unit and behaviour tests only. No browser end-to-end harness in this plan.
- No production behaviour change. If a test exposes a defect, record it and open a repair
  phase rather than widening this plan.
- No change to the parser's public signatures; the runner must fit the existing exports.

# Dependencies and stop gates

- No upstream blocker. This plan leads the portfolio.
- [parser-hardening.md](parser-hardening.md) waits for TS-04, because the matcher
  consolidation is only safe once the current behaviour is pinned by tests.
- [render-performance.md](render-performance.md) waits for TS-03 so the selector tests
  survive the memoization change.

# Decisions

- Vitest with the default Node environment. The parser is pure string work; the only browser
  surface is `File` and the directory handles, which are stubbed rather than polyfilled.
- Fixture `.wiki` trees live under `src/test/fixtures/` as real files so that the ingest
  phases read genuine `webkitRelativePath` and directory-entry shapes.
- Each phase adds runner files or tests only. A phase that must change `src/lib/wikiParser.ts`
  is out of scope and belongs to [parser-hardening.md](parser-hardening.md).

# Validation

`npm run test` passes, reports the four named areas, and `ci.yml` fails the build when a
test fails. `npm run lint`, `npm run typecheck`, and `npm run build` stay green throughout.

# Acceptance criteria

- `npm run test` exists, runs in CI, and is a required check.
- `parseFrontmatter`, `extractSections`, `parsePhases`, `extractDependencies`, and
  `extractPhaseRefs` have fixture-driven coverage including the malformed and empty cases.
- `selectFilteredPlans` is covered for every filter dimension plus the search path.
- The three ingest paths are covered against equivalent fixtures and assert equal results.

# Execution phases

## TS-01 — Runner, script, and CI gate

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: none
- Exact write set: `package.json`, `vitest.config.ts`, `src/test/setup.ts`, `.github/workflows/ci.yml`
- Primary integration lock: test runner configuration
- Outcome: `npm run test` runs an empty suite locally and in CI, and a deliberately failing test turns the CI job red.
- Focused validation: `npm run test`
- Handoff: Record the runner version, the resolved config path alias, and the CI step name, then mark TS-02 ready.

## TS-02 — Frontmatter and section parsing

- Status: planned
- Budget: 4 hours maximum
- Prerequisites: TS-01
- Exact write set: `src/test/fixtures/frontmatter/basic.md`, `src/test/fixtures/frontmatter/yaml-error.md`, `src/test/fixtures/frontmatter/no-block.md`, `src/test/fixtures/frontmatter/bom.md`, `src/test/fixtures/frontmatter/scalar-tags.md`, `src/lib/wikiParser.test.ts`
- Primary integration lock: test runner configuration
- Outcome: `parseFrontmatter` and `extractSections` are pinned, including the BOM path, the YAML error path, the missing-block path, and `normArray` splitting a scalar or comma-separated string into arrays.
- Focused validation: `npm run test src/lib/wikiParser.test.ts`
- Handoff: Record the pinned frontmatter contract, especially the `errors` strings the UI surfaces, then mark TS-03 ready.

## TS-03 — Phase, dependency, and store selector coverage

- Status: planned
- Budget: 5 hours maximum
- Prerequisites: TS-02
- Exact write set: `src/test/fixtures/phases/heading-phases.md`, `src/test/fixtures/phases/numbered-phases.md`, `src/test/fixtures/phases/status-variants.md`, `src/lib/wikiPhases.test.ts`, `src/store/planStore.test.ts`
- Primary integration lock: test runner configuration
- Outcome: phase detection, the status regex variants, title splitting, dependency extraction, phase-reference extraction, and every `selectFilteredPlans` dimension plus the search path are covered.
- Focused validation: `npm run test src/lib/wikiPhases.test.ts src/store/planStore.test.ts`
- Handoff: Record any defect the fixtures expose as a repair phase rather than editing the parser, then mark TS-04 ready.

## TS-04 — Folder ingest path coverage

- Status: planned
- Budget: 5 hours maximum
- Prerequisites: TS-03
- Exact write set: `src/test/fixtures/ingest/basic/.wiki/plan-one.md`, `src/test/fixtures/ingest/basic/.wiki/sub/plan-two.md`, `src/test/fixtures/ingest/basic/.wiki/notes.md`, `src/test/fixtures/ingest/handles.ts`, `src/lib/wikiIngest.test.ts`
- Primary integration lock: test runner configuration
- Outcome: `parseWikiFileList`, `parseWikiEntry`, and `parseWikiFolder` run against equivalent fixtures and assert identical plan ids, counts, and the `isPlanFile` rejection of `notes.md`.
- Focused validation: `npm run test src/lib/wikiIngest.test.ts`
- Handoff: Record the stub shapes for `FileSystemDirectoryHandle` and `FileSystemDirectoryEntry` so later plans can reuse them, then mark TS-04 complete evidence in [parser-hardening.md](parser-hardening.md).