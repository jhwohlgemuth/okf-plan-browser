# Templates

## Plan layout

```text
.wiki/
  index.md                 # portfolio index
  _assets/                 # wiki-wide non-Markdown artifacts
  some-plan.md             # single-file option
  another-plan/
    index.md               # folder-format Plan entrypoint
    notes.md               # any number of adjacent Markdown documents
    _assets/               # this plan's images and other non-Markdown artifacts
```

When moving `some-plan.md` to `some-plan/index.md`, update inbound links and index, network, and lane references. Link from `index.md` to `notes.md` or `_assets/image.png` with paths relative to `index.md`.

## Executable plan metadata

```yaml
---
type: Plan
title: Short outcome
description: One-sentence remaining outcome.
difficulty: low | medium | high | mixed | not-assessed
impact: low | medium | high | critical | mixed | not-assessed
package: [non-empty, owners]
tags: [focused, terms]
status: planned | in-progress | waiting-on-validation
execution: phased
phase_budget_hours: 5
---
```

## Coordination metadata

Use `execution: coordination`, omit `phase_budget_hours`, and include no execution phases. Link to atomic executable child plans.

## Execution phase

```markdown
# Execution phases

## EXP-01 — Single mergeable outcome

- Status: planned
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `path/to/file.rs`, `path/to/tests.rs`
- Primary integration lock: library API
- Outcome: One observable result.
- Focused validation: `cargo test -p package focused_test`
- Handoff: Evidence to record and the next eligible phase.
```

Use a named external system instead of paths for operational validation. Remove this entire block after completion; do not change its status to `done`.

## Incomplete handoff

```markdown
## Handoff

- Verified baseline: commit and relevant evidence.
- Changed files: exact paths.
- Validation run: commands and outcomes.
- Remaining defect: precise failure or missing prerequisite.
- Next action: one executable step.
```
