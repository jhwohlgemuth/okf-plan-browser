---
type: Plan
title: Publish OKF Plan Browser to Scoop Extras
description: Provide a Scoop-compatible Windows release and submit a verified Extras manifest.
difficulty: medium
impact: medium
package: [okf-plan-browser]
tags: [release, windows, scoop]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Windows users can install and update the desktop app from Scoop's `extras` bucket.

# Current evidence

At `8e9287a`, `.github/workflows/release.yml` only verifies an `.msi` for Windows and `src-tauri/tauri.conf.json` asks for all bundle targets. No Scoop manifest or portable Windows release asset exists in this repository. [Scoop lists Extras as the bucket for apps outside Main](https://github.com/ScoopInstaller/Scoop/blob/master/README.md); its [bucket contribution guide](https://github.com/ScoopInstaller/.github/blob/main/.github/CONTRIBUTING.md) prefers portable configuration, requires architecture metadata for 64-bit downloads, and asks contributors to test installation and autoupdate. Extras is the intended bucket, subject to its maintainers' review.

# Boundaries and decisions

- Prefer a versioned x64 ZIP containing the built desktop executable and required files, installable without running an MSI. Verify whether Tauri's Windows output can safely be repackaged and whether the app's OS keyring behavior works from the Scoop directory.
- If a portable ZIP is not viable, record the constraint and route an installer-based manifest to Scoop `nonportable` rather than disguising an MSI as portable. This is a fallback decision, not a claim of acceptance.
- Manifest source is the public, immutable GitHub release asset with its SHA-256 checksum.

# Dependencies and validation

The package must be built from a release that has passed Windows installer interaction in [desktop ingest](tauri-desktop-ingest.md). Test a clean Scoop install, launch, folder import, update, and uninstall. Follow the [Scoop manifest schema and autoupdate guidance](https://github.com/ScoopInstaller/Scoop/wiki/App-Manifests).

# Acceptance criteria

- A Windows x64 release asset works with a normal Scoop install and update path.
- The submitted manifest has exact asset URL and SHA-256, a shortcut, `checkver`, and `autoupdate`; local install/uninstall tests pass.
- The Extras PR passes verification and is accepted; documented install command names the actual approved bucket.

# Execution phases

## SC-01 — Produce and test the Scoop asset

- Status: blocked
- Budget: 5 active hours maximum
- Prerequisites: a Windows build with native folder ingest and an interactive Windows host
- Exact write set: `.github/workflows/release.yml`, `CONTRIBUTING.md`
- Primary integration lock: release workflow
- Outcome: Publish a stable x64 ZIP suitable for Scoop and verify its contents, checksum, launch, and keyring behavior.
- Focused validation: Download ZIP from a draft release on Windows; extract in an unprivileged directory; launch and import a `.wiki` folder; verify release SHA-256.
- Handoff: Record archive layout and URL pattern. If portable execution fails, record why and select the `nonportable` path before SC-02.

## SC-02 — Submit the bucket manifest

- Status: blocked
- Budget: 5 active hours maximum
- Prerequisites: SC-01 asset, successful Windows smoke result, and any Scoop maintainer intake step then in force
- Exact write set: ScoopInstaller/Extras `bucket/okf-plan-browser.json` and its PR; or ScoopInstaller/Nonportable equivalent if SC-01 establishes that fallback
- Primary integration lock: Scoop bucket manifest
- Outcome: Submit one tested manifest with automatic version checks and updates.
- Focused validation: Scoop manifest checks, clean install/launch/uninstall, `checkver`, `autoupdate`, and bucket PR verifier.
- Handoff: Record PR and catalog status; retire plan only after accepted installation works.
