# Execution lanes

Each phase takes its plan's primary lock; do not run phases concurrently if their exact write
sets intersect, even when their named locks differ.

| Plan | Primary lock | Phases |
|---|---|---|
| [Desktop ingest](tauri-desktop-ingest.md) | desktop application packaging | TD-03 |

## Write collisions

- TD-03 requires external artifacts and platform access. Do not interpret that waiting as active execution time.
