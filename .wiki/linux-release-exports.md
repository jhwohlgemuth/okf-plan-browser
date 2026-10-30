---
type: Plan
title: Verified Debian and AppImage release exports
description: Publish and smoke-test both Linux bundle formats on every desktop release.
difficulty: medium
impact: high
package: [okf-plan-browser, src-tauri]
tags: [release, linux, debian, appimage]
status: in-progress
execution: phased
phase_budget_hours: 5
---

# Goal

Every published release has a usable x86_64 `.deb` and `.AppImage` with predictable asset names and checksums.

# Current evidence

At `87f741a`, the fourth `v0.0.1` run passed CI, draft reset, and all four explicit platform upload jobs, but the publish job failed in its API asset-inventory step before checksums. The current local change verifies the draft by downloading and checking five exact filenames, then hashes those downloads before publication. It awaits a tagged run. `docs/desktop-ingest.md` records Linux interaction as pending. [Tauri v1 documents Debian and AppImage bundles](https://v1.tauri.app/v1/guides/building/linux/); build success alone does not prove a usable download.

# Boundaries and decisions

- Keep the existing Tauri 1 bundler and GitHub Releases as the upstream distribution source.
- Target x86_64 Linux initially, matching the current Ubuntu runner. A separate decision and build would be needed for ARM.
- Do not claim Debian repository or AppImage catalog publication; these are downloadable release exports.
- Keep the existing TD-03 interactive Linux folder-import acceptance in [desktop ingest](tauri-desktop-ingest.md); share its observed result rather than duplicating the test.

# Dependencies and validation

Release asset checks must run before the draft is published. A tagged draft and interactive Linux host are prerequisites for the final smoke phase. Check actual release downloads, not only local build paths. Test `.deb` installation and removal plus AppImage launch and `.wiki` import on a supported Linux host. Tauri notes that Linux compatibility is limited by the build system's glibc version; document the supported floor observed from the Ubuntu 22.04 build.

# Acceptance criteria

- The publish job requires one x86_64 `.deb` and one x86_64 `.AppImage` from the same version and exposes immutable GitHub release URLs plus SHA-256 values.
- Both downloaded artifacts pass install or launch and folder-import smoke tests on Linux, with the observed distribution recorded.
- Release and installation docs state the artifact names, checksums, and supported Linux baseline without promising older distributions that were not tested.

# Execution phases

## LX-01 — Make Linux export checks specific

- Status: in-progress
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `.github/workflows/release.yml`, `CONTRIBUTING.md`
- Primary integration lock: release workflow
- Outcome: Build explicit Debian and AppImage targets, require both expected assets for the Linux job before publishing, and attach a SHA-256 checksum file.
- Focused validation: Inspect workflow syntax; run a draft release and verify both asset names and checksums against downloaded files.
- Handoff: All explicit upload jobs passed, but the publish API inventory gate failed. Commit the download-based gate, move the unpublished tag with an exact lease, and verify all five deterministic assets and `SHA256SUMS` before making LX-02 eligible.

## LX-02 — Verify Linux downloads

- Status: blocked
- Budget: 5 active hours maximum
- Prerequisites: LX-01 draft release assets and an interactive supported Linux host
- Exact write set: `docs/desktop-ingest.md`, `CONTRIBUTING.md`
- Primary integration lock: Linux installer validation
- Outcome: Install and remove the `.deb`, execute the AppImage, and verify both open a project containing `.wiki`.
- Focused validation: Download release assets; verify SHA-256; run `dpkg` inspection and install/remove checks; launch each format and record folder-import counts.
- Handoff: Record host distribution, artifact names, and results; retire this plan when acceptance holds.
