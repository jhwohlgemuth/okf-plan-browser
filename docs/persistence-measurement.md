# Persistence measurement

Evidence for the decision to keep `localStorage` as the persistence backend.

## Method

Each wiki was parsed with `parseWikiFile` and the resulting plan array serialized with
`JSON.stringify` (with the derived `searchText` omitted, as persistence does). The reported
size is `length * 2` bytes, the convention used by the Settings size readout.

Write-scope measurements use the `planStore` persistence test and a representative synthetic
portfolio of 50 plans and 1,075,408 persisted characters (about 2.05 MB by that convention).
Browser write latency was sampled 20 times in headless Chromium on Apple Silicon on 2026-10-30.

## Results

| Wiki | Files | Raw markdown (chars) | Persisted payload |
| ---- | ----- | -------------------- | ----------------- |
| acorn (largest available) | 43 | 558,271 | 1.65 MB |
| xylem | 13 | 128,911 | 0.36 MB |
| okf-plan-browser | 15 | 68,155 | 0.20 MB |

## Interaction write cost

| Operation | Samples | Serializations | `localStorage` writes | Latency |
| ---- | ----: | ----: | ----: | ----: |
| Filter/detail-only store updates | 401 | 0 | 0 | no persistence work |
| Replace representative 50-plan portfolio | 1 | 1 | 1 | 0.30 ms serialization in Vitest |
| Write the 1,075,408-character payload in Chromium | 20 | n/a | 20 | 0.60 ms median; 0.90 ms p95 |

The persisted store carries a monotonically increasing portfolio revision. Only portfolio
actions advance it; the storage adapter checks it before copying plans or calling
`JSON.stringify`. Selection, anchors, detail visibility, filters, and storage-error UI state
therefore do not serialize or write the portfolio.

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
