# Dependency network

Genuine blockers only. A shared file is a write collision, not a blocker, and is recorded in
[parallel-execution.md](parallel-execution.md) instead.

## Plan level

[code-health-hardening.md](code-health-hardening.md) is the coordination record and blocks no
plan. It routes findings to child plans and carries no executable phase of its own.

| Plan | Blocked by | Why the blocker is genuine |
|---|---|---|
| [test-suite.md](plans/test-suite.md) | none | Leads the portfolio; everything that changes behaviour needs its coverage |
| [tauri-desktop-ingest.md](plans/tauri-desktop-ingest.md) | none | TD-02 is blocked by TD-01 inside the plan, not by another plan |
| [render-performance.md](plans/render-performance.md) | [test-suite.md](plans/test-suite.md) | Selector behaviour must be pinned before it is memoized or re-scoped |
| [bundle-size.md](plans/bundle-size.md) | [test-suite.md](plans/test-suite.md) | Deferred route modules must stay covered once they stop loading eagerly |
| [accessibility.md](plans/accessibility.md) | [test-suite.md](plans/test-suite.md) | AX-03 turns a lint rule into a required CI check, which needs the CI test gate |
| [resilience-boundaries.md](plans/resilience-boundaries.md) | [bundle-size.md](plans/bundle-size.md) | The boundary wraps the route tree that BS-01 restructures |
| [parser-hardening.md](plans/parser-hardening.md) | [test-suite.md](plans/test-suite.md) | The matcher consolidation is only safe once behaviour is pinned |
| [persistence-backend.md](plans/persistence-backend.md) | [test-suite.md](plans/test-suite.md) | The store selectors are pinned before the storage backend changes |
| [list-virtualization.md](plans/list-virtualization.md) | [render-performance.md](plans/render-performance.md) | The filtered slice must be stable and cheap before it is windowed |
| [dead-code-and-dependencies.md](plans/dead-code-and-dependencies.md) | none | Cleanup; each phase is independently mergeable |

## Phase level inside a plan

| Phase | Blocked by | Evidence required to release |
|---|---|---|
| TS-02 | TS-01 | A runner that executes locally and in CI |
| TS-03 | TS-02 | A pinned frontmatter and section contract |
| TS-04 | TS-03 | Phase, dependency, and selector coverage green |
| TD-02 | TD-01 | The per-platform ingest matrix in `docs/desktop-ingest.md` |
| TD-03 | TD-02 | A working desktop ingest path on all three platforms |
| RP-01 | TS-03 | Pinned selector behaviour |
| RP-02 | RP-01 | Whole-store subscriptions removed |
| RP-03 | RP-02 | A single haystack source and debounced search |
| BS-01 | TS-03 | Green coverage for the modules that become lazy |
| BS-02 | BS-01 | Per-route chunks and a smaller entry chunk |
| AX-02 | AX-01 | A settled activation helper for rows and cards |
| AX-03 | AX-02 | A focus-managed detail panel |
| RB-01 | BS-01 | The restructured route tree in `src/App.tsx` |
| PH-01 | TS-04 | Full parser coverage including ingest paths |
| PH-02 | PH-01 | One matcher declaration and no shared `exec` loop |
| PB-01 | TS-03 | Pinned store selectors |
| PB-02 | PB-01 | A measured payload size justifying the migration |
| LV-01 | RP-02 | A stable, cheap filtered slice |
| LV-02 | LV-01 | A windowed table with unchanged sort behaviour |
| DC-02 | DC-01 | A manifest matching the real import graph |
| DC-03 | DC-02 | One fewer field on the persisted plan shape |
| DC-04 | DC-03 | No orphaned source or unreferenced theme configuration |

## Not blockers

- [accessibility.md](plans/accessibility.md) does not block [list-virtualization.md](plans/list-virtualization.md);
  virtualizing a row changes its markup, and the accessibility role changes must be applied to
  the windowed row rather than repeated. The two plans are ordered so the role contract lands
  first, but neither waits on the other's completion.
- [dead-code-and-dependencies.md](plans/dead-code-and-dependencies.md) DC-01 does not block
  [bundle-size.md](plans/bundle-size.md) BS-02, even though both edit `package.json`. That is
  a write collision to sequence, not a product blocker.