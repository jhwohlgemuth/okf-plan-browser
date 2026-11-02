---
type: Plan
title: Make the planning skill web-installable
description: Publish machine-readable skill artifacts and a portable plugin without duplicating the canonical source.
difficulty: medium
impact: high
package: [planning, web]
tags: [skills, distribution, plugins, github-pages, opencode]
status: in-progress
execution: phased
phase_budget_hours: 5
---

# Make the planning skill web-installable

## Current evidence and decisions

The canonical skill is `.agents/skills/planning/`. A build-time collector now discovers its 11 authored files, rejects unsafe paths and symbolic links, excludes generated caches, and supplies one sorted inventory to the Planning page, raw web tree, deterministic ZIP, and OpenCode v2 catalog. The development server and production build expose `/planning-skill/SKILL.md`, `/planning-skill.zip`, and `/opencode/skills/`; copied prompts name the raw instructions and ZIP when `$planning` is unavailable. `.agents/` is also a portable `planning` plugin advertised by the `okf-plan-browser` marketplace, with its manifest version synchronized to the application version.

Keep `.agents/skills/planning/` as the only maintained copy. A build-time collector will discover every regular authored file, reject unsafe paths, exclude generated caches such as `__pycache__`, and use deterministic ordering for the rendered inventory, raw web tree, ZIP, and OpenCode catalog. Publish the latest source at `/planning-skill/SKILL.md` and `/planning-skill.zip`; tagged GitHub releases provide immutable ZIP URLs. Package `.agents/` itself as the portable plugin root because it already contains `skills/planning`.

OpenAI's plugin documentation supports portable `plugin.json` packages with a `skills/` directory and Git-backed marketplace sources. A plain URL remains the fallback for agents that can read or install Agent Skills but do not support Codex plugins. Downloaded instructions must be reviewed before installation.

OpenCode v2 natively accepts an HTTP skill-catalog base URL in the `skills` array of `opencode.json`. The base must serve `index.json`; each entry lists safe same-origin files beneath `<base>/<skill>/` and changes its string `version` whenever content changes. Publish a catalog at `/opencode/skills/` with the full SHA-256 digest of the sorted runtime paths and bytes as the `planning` version. OpenCode 1 remains supported through its existing `.agents/skills/` discovery after extracting the repository-ready ZIP.

PSD-01 completed at `0c4e097` plus the current worktree. Its 11-file catalog version is `e1cf7c5ee7876ece76a38f22deef981ea3f85aa59c0c161f054512deb2dbf479`; the deterministic ZIP SHA-256 is `2d38f3504f96d5786ad93818acd4db6189eba79cdccf1b5d34b7efc39bf5bea2`. Unit, type, lint, desktop browser, development-server, and GitHub Pages-base build validation passed. PSD-02 is complete, and PSD-03 owns the release-workflow lock; LX-01 already freed it.

PSD-02 completed with Codex CLI 0.166.0. A clean profile added the local repository marketplace, installed `planning@okf-plan-browser` version `0.0.1`, started an ephemeral read-only session against a temporary repository, loaded the installed `skills/planning/SKILL.md`, and returned `5 hours — planning`. PSD-03 now holds the release-workflow lock.

PSD-03 release run 41369592304 built and uploaded `planning-skill.zip` plus its checksum successfully. All checks and three desktop packaging legs passed; the unchanged Intel packaging leg exited generically during the Tauri build, so the release gate correctly skipped publication. The prior stable release run 41144436883 passed that Intel leg. Retry the validation tag before classifying the failure as persistent.

## Public interfaces

- Latest raw entrypoint: `https://www.jasonwohlgemuth.com/okf-plan-browser/planning-skill/SKILL.md`.
- Latest repository-ready bundle: `https://www.jasonwohlgemuth.com/okf-plan-browser/planning-skill.zip`.
- OpenCode v2 catalog: `https://www.jasonwohlgemuth.com/okf-plan-browser/opencode/skills/`, configured as `"skills": ["https://www.jasonwohlgemuth.com/okf-plan-browser/opencode/skills/"]` in `opencode.json`.
- Versioned bundle: `https://github.com/jhwohlgemuth/okf-plan-browser/releases/download/vX.Y.Z/planning-skill.zip`.
- Marketplace install: `codex plugin marketplace add jhwohlgemuth/okf-plan-browser --ref main`, then `codex plugin add planning@okf-plan-browser`.
- Copied prompts instruct the agent to review and install the ZIP at the repository root when `$planning` is unavailable.

## Acceptance criteria

Every authored planning-skill file is available from the raw web tree, included byte-for-byte in a deterministic ZIP rooted at `.agents/skills/planning/`, and listed in a valid OpenCode v2 HTTP catalog with a content-derived version. The Planning page and copied prompts use stable URLs that resolve under the GitHub Pages base path. A clean OpenCode v2 configuration can load and invoke `@planning` from the catalog; OpenCode 1 can discover the extracted `.agents` bundle. A clean Codex installation can add the repository marketplace, install `planning`, start a new session, and invoke `$planning`. Tagged releases contain the same ZIP plus a recorded SHA-256 value without weakening the existing desktop release gate.

# Execution phases

## PSD-03 — Attach immutable release bundles

- Status: in-progress
- Budget: 5 active hours maximum
- Prerequisites: none; the browser gate is repaired, and a tagged draft release remains required.
- Exact write set: `.github/workflows/release.yml`, `CONTRIBUTING.md`.
- Primary integration lock: release workflow.
- Outcome: Every tagged release uploads `planning-skill.zip` and its `.sha256` sidecar before publication, alongside the desktop artifacts.
- Focused validation: Inspect the workflow and extracted shell syntax, then run a tagged draft release; download the ZIP and checksum, verify the digest, compare its files with the tagged canonical skill, and confirm the versioned URL remains valid after publication.
- Handoff: Preserve the release tag, asset URL, checksum, file comparison, and workflow run URL; create a bounded repair phase for any packaging defect.
