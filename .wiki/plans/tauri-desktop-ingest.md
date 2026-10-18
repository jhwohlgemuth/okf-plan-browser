---
type: Plan
title: Desktop builds can load a wiki folder
description: Verify folder ingest on each Tauri webview and give the desktop shell a working load path or retire the shell.
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

`src-tauri/src/main.rs` is the eight-line Tauri default with no dialog or filesystem plugin
registered. The only ingest paths in the frontend are `window.showDirectoryPicker` at
`src/hooks/useFileSystem.ts:97` and the `<input webkitdirectory>` fallback at
`src/components/FolderPicker.tsx:126`. Neither is guaranteed inside WebView2 or WKWebView, so
the installers may present no working way to load a wiki at all.

Tauri is pinned to `1.6.0` for `@tauri-apps/api` and `@tauri-apps/cli` in `package.json`,
with `tauri = "1.6"` in `src-tauri/Cargo.toml`. Version 1.x is past its supported window and
version 2 is current, so any plugin work carries a migration.

The README at line 26 already describes the desktop app as optional, and `README.md:117`
documents installers being produced by the release workflow, so this is a published surface
rather than an abandoned experiment.

# Boundaries

- Desktop ingest only. No change to browser ingest behaviour, which stays on the File System
  Access API.
- No user-interface redesign. The outcome is a load path that works.
- If TD-01 shows every webview exposes the browser API, this plan retires in favour of a new
  plan that removes the shell; see Decisions.

# Dependencies and stop gates

- No upstream blocker, but TD-02 is `blocked` until TD-01 supplies the platform matrix.
- Blocking evidence for TD-02: the per-platform result of the browser File System Access API
  and the `webkitdirectory` fallback inside the packaged webview.

# Decisions

- TD-02 takes the Tauri 2 upgrade-and-plugin path because a bare default shell with no fs
  access cannot serve the documented workflow. The decision gate is explicit: if TD-01 shows
  the browser API already works on Windows, macOS, and Linux, stop, retire TD-02 and TD-03,
  and open a plan that deletes `src-tauri` and the release workflow instead.
- Plugin calls are added behind the existing `useFileSystem` interface so browser and desktop
  share one ingest contract rather than forking the hook.
- Verification is manual on real installers. No automated desktop end-to-end harness is
  introduced, because that would exceed the phase budget.

# Validation

A packaged build built by `npm run tauri:build` loads a real `.wiki` folder and renders the
plan count on all three platforms, with the result of each recorded in
`docs/desktop-ingest.md`.

# Acceptance criteria

- `docs/desktop-ingest.md` records the ingest result per platform for both the browser API
  and the fallback.
- The desktop target either loads a `.wiki` folder on every supported platform, or
  `src-tauri` and its release workflow are removed and the README drops the desktop claims.
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
- Exact write set: `src-tauri/Cargo.toml`, `src-tauri/src/main.rs`, `package.json`, `src/hooks/useFileSystem.ts`
- Primary integration lock: desktop application packaging
- Outcome: The desktop build selects a folder through a native dialog and returns parsed plans through the existing `useFileSystem` contract, with browser behaviour unchanged.
- Focused validation: `npm run typecheck` and `npm run lint`, then the TD-01 matrix repeated against the new build
- Handoff: Record the resolved Tauri version, the registered plugins, and the repeat of the TD-01 matrix, then mark TD-03 ready.

## TD-03 — Prove the desktop build in release CI

- Status: planned
- Budget: 3 hours maximum
- Prerequisites: TD-02
- Exact write set: `.github/workflows/release.yml`, `docs/desktop-ingest.md`
- Primary integration lock: desktop application packaging
- Outcome: The release workflow builds and uploads the installers for all three targets, and the smoke step records the launch result per platform in `docs/desktop-ingest.md`.
- Focused validation: A tagged dry run of `.github/workflows/release.yml`
- Handoff: Record the artifact names and the smoke result, then delete this plan once its criteria hold.