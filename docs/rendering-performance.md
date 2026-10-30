# Rendering performance

## Document rendering

The plan detail panel loads its Markdown renderer on first use. A short status message appears while the chunk loads. Highlighting runs only for explicitly fenced Bash, diff, JavaScript, JSON, Markdown, Python, TypeScript, and YAML code; unlabelled and unknown code remains plain text.

On 2026-10-30, the production build before this change had a 526.48 KB minified entry chunk (167.00 KB gzip). After the change, the entry chunk was 186.44 KB (64.19 KB gzip). Chromium production-preview visits to `/home` transferred 283,311 bytes of initial JavaScript at baseline and 180,503 bytes after the change, a reduction of 102,808 bytes (36.3%). Opening a demo plan for the first time then transferred the 13,652-byte Markdown chunk and a 91,176-byte shared dependency chunk, alongside route chunks. A browser test also imports a 150-section plan, delays the Markdown request, observes the loading status, and confirms the rendered body appears.

The entry chunk comparison is build output; the transfer numbers are Chromium `PerformanceResourceTiming.transferSize` measurements on local previews of the baseline and changed builds.

## Graph layout

The force simulation runs at most four ticks and six milliseconds of layout work per animation frame. It redraws after each batch, responds to drag, and shifts nodes and the force center when the SVG resizes. The current zoom scale is retained through resize. Cleanup cancels the pending frame and disconnects the observer.

A Node main-thread benchmark using the same D3 charge, center, and collision forces, 300 total ticks, and four-tick batches measured:

| Nodes | Total layout time | Maximum four-tick batch |
|---:|---:|---:|
| 20 | 8.2 ms | 1.3 ms |
| 100 | 41.4 ms | 1.8 ms |
| 300 | 159.4 ms | 3.0 ms |

These synthetic cases fit the six-millisecond budget, so workers and virtualization are deferred. The frame scheduler still applies the time limit if a larger real graph costs more. The browser integrity test verifies that resizing changes the graph position while preserving 1.25× zoom.
