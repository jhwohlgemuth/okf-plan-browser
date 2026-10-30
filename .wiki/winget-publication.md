---
type: Plan
title: Publish OKF Plan Browser to WinGet
description: Submit a validated Windows installer manifest to the community catalog.
difficulty: medium
impact: high
package: [okf-plan-browser]
tags: [release, windows, winget]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Windows users can discover, install, upgrade, and uninstall the desktop app with `winget`.

# Current evidence

At `8e9287a`, the release workflow expects a Windows `.msi` but does not inspect its install behavior or publish a WinGet manifest. Windows packaged folder ingest is pending in `docs/desktop-ingest.md`. [Microsoft requires an installer URL, manifest validation, and repository submission](https://learn.microsoft.com/en-us/windows/package-manager/package/repository); its [submission expectations](https://learn.microsoft.com/en-us/windows/package-manager/package/winget-validation) include silent install, correct uninstall for supported privileges, accurate metadata, and a publisher-hosted installer.

# Boundaries and decisions

- Use the versioned GitHub release MSI as the WinGet installer, with its SHA-256. Keep one stable `Publisher.Package` identifier after checking catalog collisions and the actual MSI publisher/product metadata.
- Do not submit a manifest against a draft or mutable URL. Keep the initial manifest scoped to the Windows architecture actually built and tested.
- External catalog approval is a prerequisite outside active phase time.

# Dependencies and validation

Requires a published Windows installer from a release that passes the native folder-import smoke test in [desktop ingest](tauri-desktop-ingest.md). Run `winget validate` and the [winget-pkgs SandboxTest](https://learn.microsoft.com/en-us/windows/package-manager/package/repository) against the exact release URL. Confirm silent installation, detected version, upgrade, and uninstall.

# Acceptance criteria

- The WinGet manifest matches the MSI metadata, immutable download URL, architecture, version, and SHA-256.
- Validation and clean Windows install, upgrade, and uninstall pass without manual installer input.
- The winget-pkgs PR is accepted and the package appears in the public catalog.

# Execution phases

## WG-01 — Validate the released MSI and author manifest

- Status: blocked
- Budget: 5 active hours maximum
- Prerequisites: published MSI from a Windows-smoke-tested desktop release and an interactive Windows host
- Exact write set: microsoft/winget-pkgs manifest files under `manifests/<letter>/<publisher>/<app>/<version>/`
- Primary integration lock: WinGet package identity
- Outcome: Choose the stable package identifier and create version, locale, and installer metadata from the observed MSI.
- Focused validation: Verify SHA-256; run `winget validate`, SandboxTest, silent install/uninstall and version detection.
- Handoff: Preserve the manifest path, validation output, and exact source release URL for WG-02.

## WG-02 — Submit and verify catalog entry

- Status: blocked
- Budget: 5 active hours maximum
- Prerequisites: WG-01 validated manifest
- Exact write set: microsoft/winget-pkgs PR and `CONTRIBUTING.md`
- Primary integration lock: WinGet submission
- Outcome: Submit the manifest, address repository validation, and document the approved install command.
- Focused validation: Check PR automation and install/upgrade by identifier after catalog indexing.
- Handoff: Record PR and catalog result; retire the plan after accepted installation succeeds.
