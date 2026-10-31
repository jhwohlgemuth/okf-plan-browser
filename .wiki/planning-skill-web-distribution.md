---
type: Plan
title: Make the planning skill web-installable
description: Publish machine-readable skill artifacts and a portable plugin without duplicating the canonical source.
difficulty: medium
impact: high
package: [planning, web]
tags: [skills, distribution, plugins, github-pages, opencode]
status: planned
execution: phased
phase_budget_hours: 5
---

# Make the planning skill web-installable

## Current evidence and decisions

The canonical skill is `.agents/skills/planning/`. `PlanningPage.tsx` currently imports its authored files individually and creates `planning-skill.zip` in browser memory, so the human download works but there is no stable URL that an agent can fetch without executing the application. Copied prompts link only to the rendered guide. The repository has no portable plugin manifest or marketplace catalog.

Keep `.agents/skills/planning/` as the only maintained copy. A build-time collector will discover every regular authored file, reject unsafe paths, exclude generated caches such as `__pycache__`, and use deterministic ordering for the rendered inventory, raw web tree, ZIP, and OpenCode catalog. Publish the latest source at `/planning-skill/SKILL.md` and `/planning-skill.zip`; tagged GitHub releases provide immutable ZIP URLs. Package `.agents/` itself as the portable plugin root because it already contains `skills/planning`.

OpenAI's plugin documentation supports portable `plugin.json` packages with a `skills/` directory and Git-backed marketplace sources. A plain URL remains the fallback for agents that can read or install Agent Skills but do not support Codex plugins. Downloaded instructions must be reviewed before installation.

OpenCode v2 natively accepts an HTTP skill-catalog base URL in the `skills` array of `opencode.json`. The base must serve `index.json`; each entry lists safe same-origin files beneath `<base>/<skill>/` and changes its string `version` whenever content changes. Publish a catalog at `/opencode/skills/` with the full SHA-256 digest of the sorted runtime paths and bytes as the `planning` version. OpenCode 1 remains supported through its existing `.agents/skills/` discovery after extracting the repository-ready ZIP.

LX-01 completed with the published `v0.0.1` release. PSD-03 may take the release-workflow integration lock after PSD-01.

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

## PSD-01 — Publish stable latest web artifacts

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none.
- Exact write set: `vite.config.ts`, `scripts/planning-skill-assets.ts`, `src/pages/PlanningPage.tsx`, `src/lib/agentCommand.ts`, `src/lib/agentCommand.test.ts`, `e2e/planning.spec.ts`, `README.md`.
- Primary integration lock: planning-skill web distribution.
- Outcome: The production build and development server expose the raw skill tree, deterministic ZIP, and OpenCode v2 catalog from one discovered inventory, and the page and copied prompts provide the matching generic, OpenCode, and Codex installation paths.
- Focused validation: Run the focused unit tests, `npm run typecheck`, the desktop `e2e/planning.spec.ts` test, and a GitHub Pages-base production build; compare every emitted file and ZIP entry with `.agents/skills/planning/`, validate `opencode/skills/index.json`, verify every catalog file is same-origin and fetchable, and confirm the version digest changes after a fixture file changes.
- Handoff: Record the public paths, OpenCode configuration, catalog version, file inventory, ZIP checksum, and focused test results for plugin packaging.

## PSD-02 — Package the skill as a Codex plugin

- Status: planned
- Budget: 5 active hours maximum
- Prerequisites: PSD-01.
- Exact write set: `.agents/plugin.json`, `.agents/plugins/marketplace.json`, `scripts/sync-version.mjs`, `.github/workflows/version-bump.yml`, `src/pages/PlanningPage.tsx`, `README.md`.
- Primary integration lock: planning plugin identity and marketplace metadata.
- Outcome: `.agents/` is a portable plugin named `planning`, the repository advertises it through marketplace `okf-plan-browser`, and plugin version changes remain synchronized with the application version.
- Focused validation: Parse and schema-check both manifests, verify version synchronization, add the repository as a marketplace in a clean Codex profile, install the plugin, start a new session, and invoke `$planning` against a temporary repository.
- Handoff: Record the installed plugin version, exact CLI commands, discovery result, and any host-version requirement.

## PSD-03 — Attach immutable release bundles

- Status: blocked
- Budget: 5 active hours maximum
- Prerequisites: PSD-01; use a tagged draft release for external validation.
- Exact write set: `.github/workflows/release.yml`, `CONTRIBUTING.md`.
- Primary integration lock: release workflow.
- Outcome: Every tagged release uploads `planning-skill.zip` and its `.sha256` sidecar before publication, alongside the desktop artifacts.
- Focused validation: Inspect the workflow and extracted shell syntax, then run a tagged draft release; download the ZIP and checksum, verify the digest, compare its files with the tagged canonical skill, and confirm the versioned URL remains valid after publication.
- Handoff: Preserve the release tag, asset URL, checksum, file comparison, and workflow run URL; create a bounded repair phase for any packaging defect.
