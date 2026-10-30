---
type: Plan
title: Publish an Apple Silicon Homebrew cask
description: Prepare a Gatekeeper-compatible macOS release and submit a cask for the desktop app.
difficulty: high
impact: high
package: [okf-plan-browser, src-tauri]
tags: [release, macos, homebrew, cask]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Apple Silicon users can install and update OKF Plan Browser through a Homebrew cask.

# Current evidence

At `8e9287a`, `.github/workflows/release.yml` produces an unsigned Apple Silicon DMG and a legacy Intel DMG; `docs/desktop-ingest.md` verifies the Apple Silicon app launches and imports a wiki, while explicitly marking Intel unsupported. No Homebrew cask or macOS signing/notarization workflow exists. [Homebrew's cask policy](https://docs.brew.sh/Acceptable-Casks) requires compatibility with every declared architecture and macOS Gatekeeper checks to pass. An unsigned DMG's observed manual launch does not establish that a cask will pass those checks.

# Boundaries and decisions

- Use `homebrew/cask` for the GUI app and declare Apple Silicon only. Remove the unsupported Intel release claim when updating release documentation; do not list Intel in the cask.
- Use the versioned GitHub release DMG and exact SHA-256. Evaluate signing and notarization using available Apple credentials; do not embed secrets in the repository.
- If official cask acceptance is unavailable, a project tap can provide a separately documented route, but it does not satisfy the official-cask acceptance criterion.

# Dependencies and validation

Signing credentials and Apple notarization access are external prerequisites for the release-hardening phase. Follow [Homebrew's cask creation and audit guidance](https://docs.brew.sh/Adding-Software-to-Homebrew). Test the downloaded DMG on a clean Apple Silicon host, including Gatekeeper, install, launch, `.wiki` import, and uninstall.

# Acceptance criteria

- A versioned Apple Silicon DMG passes Homebrew Gatekeeper audit and clean-host launch without a security bypass.
- A cask with stable token, exact URL/SHA-256, `app` stanza, and Apple Silicon constraint passes `brew audit --new --cask` and install/uninstall tests.
- The homebrew/cask PR is accepted and the documented install command works.

# Execution phases

## HB-01 — Prepare cask-compatible macOS artifact

- Status: blocked
- Budget: 5 active hours maximum
- Prerequisites: Apple Developer signing/notarization credentials and an Apple Silicon test host
- Exact write set: `.github/workflows/release.yml`, `src-tauri/tauri.conf.json`, `CONTRIBUTING.md`
- Primary integration lock: macOS release signing
- Outcome: Produce a signed and notarized Apple Silicon DMG with stable filename and checksum; align release copy with supported architecture.
- Focused validation: Verify signature, notarization, checksum, Gatekeeper assessment, and clean-host launch/import.
- Handoff: Record asset URL, checksum, signature assessment, and host details for HB-02.

## HB-02 — Author and test the cask

- Status: blocked
- Budget: 5 active hours maximum
- Prerequisites: HB-01 public release artifact
- Exact write set: homebrew/homebrew-cask `Casks/o/okf-plan-browser.rb` (or current token-shard location)
- Primary integration lock: Homebrew cask definition
- Outcome: Submit an Apple Silicon-only cask using the publisher's DMG.
- Focused validation: `brew audit --new --cask`, `brew install --cask` on a clean Apple Silicon host, launch/import, `brew uninstall --cask`, and version update URL resolution.
- Handoff: Record PR and audit result; retire plan after catalog acceptance and install verification.
