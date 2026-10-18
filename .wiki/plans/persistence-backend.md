---
type: Plan
title: The persisted portfolio is no longer bounded by the localStorage quota
description: Move persisted plan data from localStorage to IndexedDB so a large wiki survives a refresh.
difficulty: high
impact: medium
package: [okf-plan-browser]
tags: [storage, indexeddb, persistence, persistence-middleware]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Replace the `localStorage` persistence adapter with IndexedDB so the saved portfolio is no
longer capped at roughly five megabytes.

# Current evidence

`src/store/planStore.ts:32-43` wraps `localStorage` in a `safeStorage` adapter whose
`setItem` catches quota failure and flips a `storageError` flag. That guard exists because
the ceiling is a real failure mode rather than a hypothetical one.

The payload is the parsed portfolio. `partialize` at `src/store/planStore.ts:132-138`
already strips `raw` from every plan before writing, but retains every section body and phase
body, so the serialized size scales with total markdown.

`src/pages/SettingsPage.tsx:18` measures the saved payload from
`localStorage.getItem(PLAN_STORAGE_KEY).length * 2` and renders it at `:73`, so the settings
surface depends on the synchronous storage API as well.

`version: 1` is set at `src/store/planStore.ts:120` with a `merge` function at `:122-130`
that backfills repository uuids, so a storage migration path already exists to extend.

# Boundaries

- No change to the persisted data shape or to filter behaviour.
- No change to the parse pipeline.
- The settings size readout moves with the storage backend rather than being removed.

# Dependencies and stop gates

- Requires TS-03, so the store selectors are already pinned.
- Confirm the real payload size against a large wiki before starting PB-01; if the measured
  size is comfortably inside the quota, this plan retires in favour of a recorded evidence
  statement.

# Decisions

- The adapter stays behind `StateStorage`, so the store keeps the same persist middleware and
  only its storage implementation changes. Adopting `createJSONStorage` over IndexedDB keeps
  the serialization contract unchanged.
- The `version` counter increments to 2 with a `migrate` step so any existing saved portfolio
  is moved rather than discarded.
- `storageError` stays in the store interface, because IndexedDB can also fail and the app
  should keep degrading visibly.

# Validation

`npm run test` passes with a fake-indexeddb store round trip, a portfolio above the
`localStorage` quota persists across a reload, and `npm run typecheck` is clean.

# Acceptance criteria

- Persisted plans live in IndexedDB, not `localStorage`.
- A portfolio larger than the `localStorage` quota survives a reload.
- `storageError` still surfaces in `src/pages/SettingsPage.tsx` when the new backend fails.
- Existing saved portfolios migrate instead of being discarded.

# Execution phases

## PB-01 — Measure the real persisted payload

- Status: planned
- Budget: 2 hours maximum
- Prerequisites: TS-03
- Exact write set: `docs/persistence-measurement.md`
- Primary integration lock: none; this phase records evidence only
- Outcome: A recorded measurement states the serialized byte size for the largest available wiki and the current quota headroom, so the migration is justified by evidence.
- Focused validation: `npm run build`, then load the largest wiki and read the size reported in `src/pages/SettingsPage.tsx`
- Handoff: Record the byte size and the decision to proceed or retire, then mark PB-02 ready or retire this plan.

## PB-02 — Move persistence to IndexedDB

- Status: planned
- Budget: 5 hours maximum
- Prerequisites: PB-01
- Exact write set: `src/store/planStore.ts`, `src/lib/indexedDbStorage.ts`, `src/pages/SettingsPage.tsx`, `package.json`
- Primary integration lock: plan store persistence contract
- Outcome: The store persists through an IndexedDB adapter at `version: 2`, existing portfolios migrate on first load, and the settings size readout reports the IndexedDB payload.
- Focused validation: `npm run test`, then load a portfolio above the `localStorage` quota and reload
- Handoff: Record the migration behaviour and the size readout source, then delete this plan once its criteria hold.