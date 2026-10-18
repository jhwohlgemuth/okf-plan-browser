# Persistence measurement

Evidence for the decision to keep `localStorage` as the persistence backend.

## Method

Each wiki was parsed with `parseWikiFile` and the resulting plan array serialized with
`JSON.stringify` (with the derived `searchText` omitted, as `partialize` does). The reported
size is `length * 2` bytes, the convention used by the Settings size readout.

## Results

| Wiki | Files | Raw markdown (chars) | Persisted payload |
| ---- | ----- | -------------------- | ----------------- |
| acorn (largest available) | 43 | 558,271 | 1.65 MB |
| xylem | 13 | 128,911 | 0.36 MB |
| okf-plan-browser | 15 | 68,155 | 0.20 MB |

## Headroom

`localStorage` quotas are about 5 million UTF-16 characters (~10 MB when counted in bytes by
the `length * 2` convention). The largest wiki uses about 0.83 million characters, roughly 16%
of the quota. All three wikis together use about 1.1 million characters, about 22%.

## List size

The largest wiki has 43 plan files, so the portfolio table renders at most a few dozen rows
and each phase-board column a few dozen cards. That is well below the point where windowing
pays for its complexity, so list virtualization was not adopted either.

## Decision

The measured payload is comfortably inside the quota, so the IndexedDB migration (PB-02) is
not justified. `safeStorage` in `src/store/planStore.ts` still catches quota failures and sets
`storageError`, which the Settings page surfaces. Revisit if a single wiki approaches 2 MB of
persisted characters (about 4 MB in the readout).
