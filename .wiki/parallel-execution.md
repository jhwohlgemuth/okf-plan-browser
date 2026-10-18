# Parallel execution

One primary integration lock per phase, and the lanes that can run concurrently. A lane is
safe only when no two ready phases share a file.

## Primary integration locks

| Lock | Phases holding it |
|---|---|
| Test runner configuration | TS-01, TS-02, TS-03, TS-04 |
| Desktop application packaging | TD-01, TD-02, TD-03 |
| Plan store selector contract | RP-01, RP-02 |
| Dependency graph layout | RP-03 |
| Application entry and chunk graph | BS-01, BS-02, RB-01 |
| Plan selection interaction contract | AX-01, AX-02 |
| Lint rule set | AX-03 |
| Wiki parser output contract | PH-01 |
| TypeScript compiler configuration | PH-02 |
| None, evidence only | PB-01 |
| Plan store persistence contract | PB-02 |
| Portfolio table render path | LV-01 |
| Phase board render path | LV-02 |
| Dependency manifest | DC-01 |
| Persisted plan data shape | DC-02 |
| None, deletion only | DC-03 |
| None, copy only | DC-04 |
| None, coordination only | [code-health-hardening.md](code-health-hardening.md) |

## Lanes at rest

Before TS-01 lands, only two phases are ready and they collide, so only one runs at a time:
DC-01 touches `package.json` and BS-02 removes `framer-motion` from `package.json`. The
dependency manifest lock is taken first because AX-03 needs a CI gate to build on and DC-02
depends on DC-01 completing the manifest reconciliation.

## Lanes after TS-04

Four lanes run concurrently with disjoint write sets:

| Lane | Plans in sequence | Files |
|---|---|---|
| Performance | [render-performance.md](plans/render-performance.md) RP-01, RP-02, RP-03 | `src/store/planStore.ts`, `src/lib/wikiParser.ts`, `src/types/wiki.ts`, `src/components/PlanTable.tsx`, `src/lib/utils.ts`, `src/components/DependencyGraph.tsx`, `src/components/FilterBar.tsx`, `src/components/PlanDetailPanel.tsx`, `src/hooks/useFileSystem.ts`, `src/pages/HomePage.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/PortfolioPage.tsx` |
| Bundle and resilience | [bundle-size.md](plans/bundle-size.md) BS-01, BS-02, then [resilience-boundaries.md](plans/resilience-boundaries.md) RB-01 | `src/App.tsx`, `src/components/RouteFallback.tsx`, `src/components/ErrorFallback.tsx`, `src/components/NotFoundPage.tsx`, `src/components/PlanDetailPanel.tsx`, `vite.config.ts`, `package.json`, `src/index.css` |
| Accessibility | [accessibility.md](plans/accessibility.md) AX-01, AX-02, AX-03 | `src/components/PlanTable.tsx`, `src/components/KanbanBoard.tsx`, `src/pages/SearchPage.tsx`, `src/components/PlanDetailPanel.tsx`, `src/components/FilterBar.tsx`, `.eslintrc.cjs`, `package.json` |
| Cleanup | [dead-code-and-dependencies.md](plans/dead-code-and-dependencies.md) DC-01, DC-02, DC-03, DC-04 | `package.json`, `src/pages/AboutPage.tsx`, `src/types/wiki.ts`, `src/lib/wikiParser.ts`, `src/store/planStore.ts`, `src/hooks/useTheme.ts`, `tailwind.config.js`, `src/pages/SettingsPage.tsx`, `README.md` |
| Desktop | [tauri-desktop-ingest.md](plans/tauri-desktop-ingest.md) TD-01, TD-02, TD-03 | `docs/desktop-ingest.md`, `src-tauri/Cargo.toml`, `src-tauri/src/main.rs`, `src/hooks/useFileSystem.ts`, `.github/workflows/release.yml`, `package.json` |
| Parser and storage | [parser-hardening.md](plans/parser-hardening.md) PH-01, PH-02, then [persistence-backend.md](plans/persistence-backend.md) PB-01, PB-02 | `src/lib/wikiParser.ts`, `tsconfig.json`, `src/lib/demoData.ts`, `src/lib/names.ts`, `src/store/planStore.ts`, `src/lib/indexedDbStorage.ts`, `src/pages/SettingsPage.tsx`, `package.json`, `docs/persistence-measurement.md` |
| Virtualization | [list-virtualization.md](plans/list-virtualization.md) LV-01, LV-02 | `package.json`, `src/components/PlanTable.tsx`, `src/components/KanbanBoard.tsx` |
| Coverage | [test-suite.md](plans/test-suite.md) TS-01, TS-02, TS-03, TS-04 | `package.json`, `vitest.config.ts`, `src/test/setup.ts`, `.github/workflows/ci.yml`, fixtures and test files under `src/` |

## Collisions that forbid concurrency

| Files | Conflicting phases | Resolution |
|---|---|---|
| `package.json` | DC-01, BS-02, AX-03, PB-02, DC-01 and TD-02 | Take the dependency manifest lock; sequence the rest in one lane |
| `src/components/PlanDetailPanel.tsx` | RP-01, AX-02, BS-02 | Accessibility takes the panel before bundle work, since BS-02 rewrites the panel's animation |
| `src/types/wiki.ts` | RP-02, DC-02, DC-03 | Cleanup is sequential internally; RP-02 lands before or after, never during |
| `src/store/planStore.ts` | RP-02, DC-02, PB-02 | Persistence follows performance, because PB-02 changes the persisted shape |
| `src/components/PlanTable.tsx` | RP-02, AX-01, LV-01 | Virtualization is last; the role contract lands before the windowed row |
| `src/lib/wikiParser.ts` | RP-02, DC-02, PH-01 | Parser hardening runs after the raw-field removal so the write set is stable |
| `src/pages/SettingsPage.tsx` | RP-01, DC-04, PB-02 | Cleanup precedes the settings size-readout change |
| `src/hooks/useFileSystem.ts` | RP-01, TD-02 | Desktop work takes the hook after the subscription fix settles it |
| `.github/workflows/ci.yml` | TS-01, TD-03 | Test gate lands first; the release workflow is separate from the CI job |

## Scheduling rule

Take at most one phase per primary integration lock at a time. When a lock is unavailable,
start the next phase whose write set is disjoint from every in-flight phase, and record the
lock it holds before editing.