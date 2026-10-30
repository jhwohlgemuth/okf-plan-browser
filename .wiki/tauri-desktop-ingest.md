---
type: Plan
title: Desktop builds can load a wiki folder
description: Verify folder ingest on each Tauri webview and repair the desktop load path where platform evidence requires it.
difficulty: high
impact: critical
package: [okf-plan-browser, src-tauri]
tags: [tauri, desktop, rust, file-system, decision]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Establish whether a user of the published installers can actually load a `.wiki` folder, and
leave the desktop target in a state where the answer is yes.

# Current evidence

Apple Silicon baseline packaging proved the browser fallback cannot import an advertised project
folder because the hidden `.wiki` child is absent from its file list. The repaired desktop route uses
Tauri 1.8.3's built-in native dialog plus scope-checked Rust commands to read only the selected wiki
tree and lazy-load its assets. TypeScript, lint, focused ingest tests, native tests, and packaging pass.

The mounted Apple Silicon DMG launches and imports this repository as 3 plans plus 1 Epic with no
warnings. [The durable platform record](../docs/desktop-ingest.md) names the artifact and distinguishes
observed results from the Windows and Linux installer rows that still need release artifacts and
hosts.

# Boundaries

- Desktop ingest only. Browser ingest behaviour remains on the File System Access API and
  `webkitdirectory` fallback.
- Intel macOS is not a supported target and is outside the validation matrix.
- No user-interface redesign. The outcome is a load path that works.

# Dependencies and stop gates

- TD-01 and TD-02 are complete and pruned after preserving their evidence in code, tests, and
  `docs/desktop-ingest.md`.
- TD-03 is blocked on draft release artifacts and interactive hosts for Windows and Linux. Apple
  Silicon is complete.

# Decisions

- Keep the native folder interface behind `useFileSystem`; browser code does not branch on the OS.
- Remain on Tauri 1.x. The built-in `dialog-open` capability and application commands require no
  framework migration or external plugin.
- Verify real installers manually; automated unit checks are complementary evidence.

# Validation

Launch the remaining draft release installers on Windows and Linux; load a real project folder
containing `.wiki`; and record the rendered counts in `docs/desktop-ingest.md`.

# Acceptance criteria

- `docs/desktop-ingest.md` records observed baseline and native-path results without treating a CI
  build as interactive evidence.
- The desktop target loads a `.wiki` folder on every supported platform.
- No frontend file branches on the runtime platform; ingest stays behind one interface.

# Execution phases

## TD-03 — Verify packaged installer interaction

- Status: blocked
- Budget: 3 hours maximum
- Prerequisites: draft release artifacts built from the native-ingest change and interactive Windows
  and Linux hosts
- Exact write set: `docs/desktop-ingest.md`
- Primary integration lock: desktop application packaging
- Outcome: Complete the actual installer launch and native folder-import matrix for Windows and
  Linux; Apple Silicon is already verified.
- Focused validation: Launch each remaining draft release installer, select a project folder that
  contains `.wiki`, and confirm the expected plan and Epic counts render without warnings.
- Handoff: Record the artifact names and the smoke result, then delete this plan once its criteria hold.
