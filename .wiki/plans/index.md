# Executable plans

Atomic executable plans in this portfolio. Ranking and finding-to-plan routing live in the
coordination record [code-health-hardening.md](../code-health-hardening.md).

| Order | Plan | Difficulty | Impact | Outcome |
|---|---|---|---|---|
| 1 | [test-suite.md](test-suite.md) | medium | critical | A test runner in CI covering the parser, the ingest paths, and the store selectors |
| 2 | [tauri-desktop-ingest.md](tauri-desktop-ingest.md) | high | critical | Desktop builds can load a `.wiki` folder, verified per platform |
| 3 | [render-performance.md](render-performance.md) | medium | high | Store updates stop re-filtering and re-rendering unchanged trees |
| 4 | [bundle-size.md](bundle-size.md) | medium | high | First paint stops downloading D3, the markdown renderer, and the animation runtime |
| 5 | [accessibility.md](accessibility.md) | medium | high | Every control is keyboard reachable and the detail panel is a real dialog |
| 6 | [resilience-boundaries.md](resilience-boundaries.md) | low | medium | A render fault or unknown URL shows a recovery surface instead of a blank page |
| 7 | [parser-hardening.md](parser-hardening.md) | medium | medium | One phase-reference matcher and stricter indexed access, proven by tests |
| 8 | [persistence-backend.md](persistence-backend.md) | high | medium | The persisted portfolio is no longer bounded by the `localStorage` quota |
| 9 | [list-virtualization.md](list-virtualization.md) | medium | medium | Long portfolios render a window of rows and cards |
| 10 | [dead-code-and-dependencies.md](dead-code-and-dependencies.md) | low | low | No unused dependency, orphaned module, or stale shipped string remains |

Dependency edges and lane assignment are in [plan-network.md](../plan-network.md) and
[parallel-execution.md](../parallel-execution.md).