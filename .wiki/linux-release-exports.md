---
type: Plan
title: Verified Debian and AppImage release exports
description: Publish and smoke-test both Linux bundle formats on every desktop release.
difficulty: medium
impact: high
package: [okf-plan-browser, src-tauri]
tags: [release, linux, debian, appimage]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Every published release has a usable x86_64 `.deb` and `.AppImage` with predictable asset names and checksums.

# Current evidence

The [published `v0.0.1` release](https://github.com/jhwohlgemuth/okf-plan-browser/releases/tag/v0.0.1) from `346ce14` contains both canonical Linux exports, `okf-plan-browser_0.0.1_linux-x64.deb` and `okf-plan-browser_0.0.1_linux-x64.AppImage`, with a `.sha256` sidecar each. All four build/upload jobs and publish passed in [run 41144436883](https://github.com/jhwohlgemuth/okf-plan-browser/actions/runs/41144436883); public checksum contents match GitHub's asset digests. The Tauri action also uploaded redundant default-named assets, so the workflow on main now invokes the Tauri CLI directly for subsequent releases. `docs/desktop-ingest.md` records Linux interaction as pending. [Tauri v1 documents Debian and AppImage bundles](https://v1.tauri.app/v1/guides/building/linux/); build success alone does not prove a usable launch.

# Boundaries and decisions

- Keep the existing Tauri 1 bundler and GitHub Releases as the upstream distribution source.
- Target x86_64 Linux initially, matching the current Ubuntu runner. A separate decision and build would be needed for ARM.
- Do not claim Debian repository or AppImage catalog publication; these are downloadable release exports.
- Keep the existing TD-03 interactive Linux folder-import acceptance in [desktop ingest](tauri-desktop-ingest.md); share its observed result rather than duplicating the test.

# Dependencies and validation

The published artifacts and an interactive Linux host are prerequisites for the final smoke phase. Check actual release downloads, not only local build paths. Test `.deb` installation and removal plus AppImage launch and `.wiki` import on a supported Linux host. Tauri notes that Linux compatibility is limited by the build system's glibc version; document the supported floor observed from the Ubuntu 22.04 build.

# Acceptance criteria

- The publish job requires successful x86_64 `.deb` and `.AppImage` uploads from the same version, each with a SHA-256 sidecar and stable GitHub release URL.
- Both downloaded artifacts pass install or launch and folder-import smoke tests on Linux, with the observed distribution recorded.
- Release and installation docs state the artifact names, checksums, and supported Linux baseline without promising older distributions that were not tested.

# Execution phases

## LX-02 — Verify Linux downloads

- Status: blocked
- Budget: 5 active hours maximum
- Prerequisites: an interactive supported Linux host; `v0.0.1` assets are published
- Exact write set: `docs/desktop-ingest.md`, `CONTRIBUTING.md`
- Primary integration lock: Linux installer validation
- Outcome: Install and remove the `.deb`, execute the AppImage, and verify both open a project containing `.wiki`.
- Focused validation: Download release assets; verify SHA-256; run `dpkg` inspection and install/remove checks; launch each format and record folder-import counts.
- Handoff: Record host distribution, artifact names, and results; retire this plan when acceptance holds.
