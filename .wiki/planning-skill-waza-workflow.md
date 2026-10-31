---
type: Plan
title: Add Waza development and behavioral testing for the planning skill
description: Provide an isolated, repeatable workflow for improving and evaluating every planning-skill route.
difficulty: medium
impact: high
package: [planning, quality]
tags: [skills, waza, evaluation, ci]
status: planned
execution: phased
phase_budget_hours: 5
---

# Add Waza development and behavioral testing for the planning skill

## Current evidence and decisions

The canonical `.agents/skills/planning/` package has instructions, references, agent metadata, a validator, and 16 passing validator unit tests. It has no Waza configuration, evaluation specs, task fixtures, behavior graders, developer targets, or skill-specific CI. Waza is not installed on the current host.

Use `my-shell-setup`'s `agents-check`, `agents-test`, and `agents-dev` pattern as the command-interface reference, including its distinction between credential-free mock runs and opt-in real-agent evaluation. Adapt the storage layout to this repository: configure Waza's project workspace with skills at `.agents/skills/` and evaluations at root `evals/`. Do not place Waza-only tasks, fixtures, results, or workflow metadata inside the canonical planning skill, so the web ZIP, OpenCode catalog, and Codex plugin remain runtime-only without special exclusions.

Target [Waza v0.39.1](https://microsoft.github.io/waza/) or newer for local work because that release supports `waza dev` with a `SKILL.md` path. Use Waza's documented [separated workspace](https://microsoft.github.io/waza/reference/waza-yaml/) with `evals/<skill>/` discovery. Pin v0.39.1 in CI until a deliberate upgrade updates the plan evidence and schemas. Mock execution establishes only harness health; it must never be reported as planning-skill behavior evidence. Model-backed suites use isolated miniature repositories, remain explicit because they can require credentials or paid calls, and preserve their baseline and refinement results outside the active skill package.

Keep natural routing separate from behavior scoring. The routing suite disables skill-body injection and checks explicit, implicit, and unrelated prompts against actual skill discovery. Behavior suites inject the target skill and grade repository artifacts, cross-index consistency, bounded phase structure, resumable handoffs, and source-backed draft evidence. A discovered behavior defect becomes a bounded repair phase rather than silently expanding an evaluation phase.

## Developer interfaces

- `make planning-skill-check`: run `waza check`, strict `waza spec verify`, and preflight checks without a model call.
- `make planning-skill-test`: run the credential-free mock harness into a temporary results directory and label it as wiring evidence only.
- `make planning-skill-dev`: start `waza dev .agents/skills/planning/SKILL.md` for interactive frontmatter and instruction refinement.
- `make planning-skill-test-real`: explicitly run the natural-routing and injected behavior suites with the configured model provider; never invoke this target from default CI.

## Acceptance criteria

Waza discovers the planning skill and separated evaluation workspace from the repository root. Static readiness, strict spec coverage, preflight, and mock harness checks are reproducible without credentials. Natural-routing trials distinguish relevant planning or drafting requests from unrelated work without injecting the skill body. Model-backed fixture trials verify bounded plan creation, completed-work pruning, preservation of blocked work and stable IDs, cross-index updates, resumable implementation handoffs, source-backed drafting, claim verdicts, and absence of edits outside the isolated workspace. CI pins Waza, runs only credential-free gates plus the existing validator tests, and fails on a deliberately broken task or uncovered requirement. Real evaluation remains opt-in and records the Waza version, model, task results, file diffs, and limitations.

# Execution phases

## PWZ-01 — Establish the Waza workspace and offline runner contract

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: Install Waza v0.39.1 or newer from the official distribution before local validation; no provider credentials are required.
- Exact write set: `.waza.yaml`, `.gitignore`, `Makefile`, `CONTRIBUTING.md`, `evals/planning/eval.yaml`, `evals/planning/routing.yaml`, `evals/planning/tasks/explicit-planning.yaml`, `evals/planning/tasks/unrelated-request.yaml`.
- Primary integration lock: planning-skill Waza runner interface.
- Outcome: The repository has separated skill/eval discovery and documented check, mock-test, interactive-dev, and explicit real-test targets. The offline suite validates schemas and wiring; the routing suite is configured for natural discovery without skill-body injection.
- Focused validation: Run `waza --version`, `waza check .agents/skills/planning`, strict `waza spec verify`, preflight for both specs, the mock target, the existing 16 validator tests, and a dry inspection proving results and Waza caches are ignored.
- Handoff: Record the Waza version, exact commands, discovered skill/eval paths, mock result, spec-coverage report, and the unavailable provider prerequisite if a real run was not authorized.

## PWZ-02 — Evaluate portfolio lifecycle behavior

- Status: planned
- Budget: 5 active hours maximum
- Prerequisites: PWZ-01 and explicit authorization for any model-backed trial.
- Exact write set: `evals/planning/portfolio.yaml`, `evals/planning/tasks/create-bounded-plan.yaml`, `evals/planning/tasks/prune-completed-work.yaml`, `evals/planning/tasks/preserve-blocked-work.yaml`, `evals/planning/fixtures/create-bounded-plan/`, `evals/planning/fixtures/prune-completed-work/`, `evals/planning/fixtures/preserve-blocked-work/`, `evals/planning/graders/wiki_state.py`, `evals/planning/eval.yaml`.
- Primary integration lock: planning portfolio behavior suite.
- Outcome: Injected-skill trials grade five-hour phase structure, exact write sets, locks and validation, completed-work removal, blocked-work preservation, stable phase IDs, and synchronized index/network/lane edits in isolated repositories.
- Focused validation: Run schema and strict spec checks, preflight and mock wiring, then one explicitly authorized model-backed trial per task; validate produced wikis, inspect complete file diffs, and confirm source fixtures and paths outside each trial workspace remain unchanged.
- Handoff: Preserve task-level scores, model and Waza versions, output diffs, validator results, false positives, and any behavior defect that requires a separate repair phase.

## PWZ-03 — Evaluate resumable implementation and drafting behavior

- Status: planned
- Budget: 5 active hours maximum
- Prerequisites: PWZ-01 and explicit authorization for any model-backed trial; independent of PWZ-02 after the runner contract is stable.
- Exact write set: `evals/planning/workflows.yaml`, `evals/planning/tasks/resume-implementation.yaml`, `evals/planning/tasks/source-backed-draft.yaml`, `evals/planning/tasks/resume-draft.yaml`, `evals/planning/tasks/review-claims.yaml`, `evals/planning/fixtures/resume-implementation/`, `evals/planning/fixtures/source-backed-draft/`, `evals/planning/fixtures/resume-draft/`, `evals/planning/fixtures/review-claims/`, `evals/planning/graders/artifact_state.py`, `evals/planning/eval.yaml`.
- Primary integration lock: planning workflow behavior suite.
- Outcome: Injected-skill trials grade recovery from `progress.md`, adherence to the authorized phase and write set, outline/article/check creation, verified/incorrect/unresolved claim handling, precise missing-evidence notes, and preservation of unrelated files.
- Focused validation: Run schema and strict spec checks, preflight and mock wiring, then one explicitly authorized model-backed trial per task; inspect generated progress, draft, and checks artifacts, grader evidence, and complete file diffs.
- Handoff: Preserve task-level scores, model and Waza versions, artifact evidence, unresolved evaluator limitations, and any defect requiring a separate repair phase.

## PWZ-04 — Gate planning-skill changes in CI

- Status: planned
- Budget: 5 active hours maximum
- Prerequisites: PWZ-02 and PWZ-03 schemas, tasks, fixtures, and offline checks pass.
- Exact write set: `.github/workflows/planning-skill.yml`, `Makefile`, `CONTRIBUTING.md`.
- Primary integration lock: planning-skill CI gate.
- Outcome: A path-filtered workflow pins Waza v0.39.1 and runs readiness, strict spec coverage, preflight, mock wiring, and planning-validator tests without provider credentials or paid calls; model-backed targets remain manual.
- Focused validation: Run the aggregate offline target locally, inspect workflow syntax and permissions, prove a deliberately broken temporary task or uncovered requirement fails the same command, then record a passing GitHub Actions run.
- Handoff: Preserve the workflow run, pinned toolchain, commands and results, failure-injection evidence, and documented procedure for an opt-in real-agent regression run.
