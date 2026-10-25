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

The Tauri backend now implements OS credential storage and bounded forge requests with cancellation.
It has no native folder-ingest command. Browser folder picking and the directory-input fallback
remain the local ingest paths. Native unit tests are configured in CI on Windows, Linux, Intel Mac, and Apple
Silicon Mac, and publishing waits for validation and packaging. These checks do not establish
whether folder selection works inside each packaged webview.

The dependency remains Tauri 1.x. A framework migration is not a prerequisite until the platform
matrix identifies an actual limitation. Preserve the existing credential and request contracts.

# Boundaries

- Desktop ingest only. No change to browser ingest behaviour, which stays on the File System
  Access API.
- No user-interface redesign. The outcome is a load path that works.
- If TD-01 verifies the current load path everywhere, retire implementation phases after preserving the platform evidence.

# Dependencies and stop gates

- No upstream blocker, but TD-02 is `blocked` until TD-01 supplies the platform matrix.
- Blocking evidence for TD-02: the per-platform result of the browser File System Access API
  and the `webkitdirectory` fallback inside the packaged webview.

# Decisions

- Keep the desktop target if its current folder picker works. Do not remove a working shell.
- If a platform lacks folder ingest, add a bounded native folder interface behind useFileSystem.
- Scope any required framework migration as a separate plan after the platform evidence exists.
- Verify real installers manually; automated unit checks are complementary evidence.

# Validation

A packaged build built by `npm run tauri:build` loads a real `.wiki` folder and renders the
plan count on all three platforms, with the result of each recorded in
`docs/desktop-ingest.md`.

# Acceptance criteria

- `docs/desktop-ingest.md` records the ingest result per platform for both the browser API
  and the fallback.
- The desktop target loads a `.wiki` folder on every supported platform, with any unsupported platform documented until repaired.
- No frontend file branches on the runtime platform; ingest stays behind one interface.

# Execution phases

## TD-01 — Verify desktop ingest per platform

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: none
- Exact write set: `docs/desktop-ingest.md`
- Primary integration lock: desktop application packaging
- Outcome: A table records, for Windows, macOS, and Linux, whether `showDirectoryPicker` exists in the packaged webview, whether the `webkitdirectory` fallback works, and which path a user would actually reach.
- Focused validation: `npm run tauri:build`, then launch the packaged binary once per platform
- Handoff: Record the matrix and the resulting decision, then set TD-02 to `ready` or retire this plan per Decisions.

## TD-02 — Give the desktop shell a filesystem ingest path

- Status: blocked
- Budget: 5 hours maximum
- Prerequisites: TD-01
- Exact write set: `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src/hooks/useFileSystem.ts`, `src/vite-env.d.ts`
- Primary integration lock: desktop application packaging
- Outcome: The desktop build selects a folder through a native dialog and returns parsed plans through the existing `useFileSystem` contract, with browser behaviour unchanged.
- Focused validation: `npm run typecheck` and `npm run lint`, then the TD-01 matrix repeated against the new build
- Handoff: Record the resolved Tauri version, the registered plugins, and the repeat of the TD-01 matrix, then mark TD-03 ready.

## TD-03 — Verify packaged installer interaction

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: TD-02
- Exact write set: `docs/desktop-ingest.md`
- Primary integration lock: desktop application packaging
- Outcome: Record actual installer launch and folder-import behavior for each supported platform, using the gated release artifacts.
- Focused validation: Launch the draft release installers on Windows, Intel Mac, Apple Silicon Mac, and Linux
- Handoff: Record the artifact names and the smoke result, then delete this plan once its criteria hold.