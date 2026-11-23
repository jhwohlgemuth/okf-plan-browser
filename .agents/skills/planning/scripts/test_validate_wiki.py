#!/usr/bin/env python3
"""Tests for the planning wiki validator."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from validate_wiki import validate_repository


PLAN = """---
type: Plan
title: Example
description: Example plan.
created: "2026-11-23T21:07:56Z"
updated: "2026-11-23T21:07:56Z"
difficulty: low
impact: medium
package: [workspace]
tags: [example]
status: planned
execution: phased
phase_budget_hours: 5
---

# Goal

Example.

# Execution phases

## EX-01 — Example outcome

- Status: ready
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `example.txt`
- Primary integration lock: none
- Outcome: Produce the example.
- Focused validation: `true`
- Handoff: Record the result.
"""

COORDINATION = """---
type: Plan
title: Coordination
description: Coordination record.
created: "2026-11-23T21:07:56Z"
updated: "2026-11-23T21:07:56Z"
difficulty: high
impact: critical
package: [workspace]
tags: [coordination]
status: in-progress
execution: coordination
---

# Goal

Coordinate child plans.
"""

DUPLICATE_PHASE = """

## EX-01 — Duplicate outcome

- Status: planned
- Budget: 5 active hours maximum
- Prerequisites: none
- Exact write set: `duplicate.txt`
- Primary integration lock: none
- Outcome: Produce the duplicate.
- Focused validation: `true`
- Handoff: Record the duplicate.
"""


class ValidatorTests(unittest.TestCase):
    def _repository(self, plan: str = PLAN) -> Path:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        wiki = root / ".wiki"
        feature = wiki / "features"
        feature.mkdir(parents=True)
        (feature / "example.md").write_text(plan, encoding="utf-8")
        (feature / "index.md").write_text("[Example](example.md)\n", encoding="utf-8")
        (wiki / "coordination.md").write_text(COORDINATION, encoding="utf-8")
        (wiki / "index.md").write_text(
            "The portfolio contains 1 executable plan and one coordination record.\n"
            "[Example](features/example.md)\n[Coordination](coordination.md)\n",
            encoding="utf-8",
        )
        membership = "[Example](features/example.md)\n[Coordination](coordination.md)\n"
        (wiki / "parallel-execution.md").write_text(membership, encoding="utf-8")
        (wiki / "plan-network.md").write_text(membership, encoding="utf-8")
        return root

    def test_budget_over_five_hours_is_rejected(self) -> None:
        root = self._repository(PLAN.replace("5 active hours maximum", "6 active hours maximum"))
        self.assertTrue(any("budget must be positive" in error for error in validate_repository(root)))

    def test_broken_link_is_rejected(self) -> None:
        root = self._repository(PLAN + "\n[Missing](missing.md)\n")
        self.assertTrue(any("broken link" in error for error in validate_repository(root)))

    def test_completed_checklist_is_rejected(self) -> None:
        root = self._repository(PLAN + "\n- [x] old task\n")
        self.assertTrue(any("completed checklist" in error for error in validate_repository(root)))

    def test_completed_section_is_rejected(self) -> None:
        root = self._repository(PLAN + "\n## Completed work\n\nHistorical record.\n")
        self.assertTrue(any("completed section" in error for error in validate_repository(root)))

    def test_completed_phase_status_is_rejected(self) -> None:
        root = self._repository(PLAN.replace("Status: ready", "Status: complete"))
        self.assertTrue(any("invalid phase status" in error for error in validate_repository(root)))

    def test_unknown_operating_system_label_is_rejected(self) -> None:
        root = self._repository(PLAN.replace("tags: [example]", "tags: [example, os:window]"))
        self.assertTrue(any("unsupported operating-system label `os:window`" in error for error in validate_repository(root)))

    def test_supported_operating_system_label_is_accepted(self) -> None:
        root = self._repository(PLAN.replace("tags: [example]", "tags: [example, os:windows]"))
        self.assertFalse(any("operating-system label" in error for error in validate_repository(root)))

    def test_in_progress_plan_requires_an_in_progress_phase(self) -> None:
        root = self._repository(PLAN.replace("status: planned", "status: in-progress"))
        self.assertTrue(any("no phase is in-progress" in error for error in validate_repository(root)))

    def test_in_progress_plan_with_an_active_phase_passes(self) -> None:
        active = PLAN.replace("status: planned", "status: in-progress").replace("- Status: ready", "- Status: in-progress")
        self.assertEqual(validate_repository(self._repository(active)), [])

    def test_dangling_prerequisite_is_rejected(self) -> None:
        root = self._repository(PLAN.replace("Prerequisites: none", "Prerequisites: XX-99"))
        self.assertTrue(any("unknown prerequisite" in error for error in validate_repository(root)))

    def test_duplicate_phase_id_is_rejected(self) -> None:
        root = self._repository(PLAN + DUPLICATE_PHASE)
        self.assertTrue(any("duplicate phase ID" in error for error in validate_repository(root)))

    def test_empty_package_is_rejected(self) -> None:
        root = self._repository(PLAN.replace("package: [workspace]", "package: []"))
        self.assertTrue(any("package must be a non-empty list" in error for error in validate_repository(root)))

    def test_glob_write_set_is_rejected(self) -> None:
        root = self._repository(PLAN.replace("`example.txt`", "`src/*.rs`"))
        self.assertTrue(any("contains a glob" in error for error in validate_repository(root)))

    def test_missing_metadata_is_rejected(self) -> None:
        root = self._repository(PLAN.replace("impact: medium\n", ""))
        self.assertTrue(any("missing frontmatter `impact`" in error for error in validate_repository(root)))

    def test_missing_and_invalid_timestamps_are_rejected(self) -> None:
        root = self._repository(PLAN.replace('created: "2026-11-23T21:07:56Z"\n', '').replace('updated: "2026-11-23T21:07:56Z"', 'updated: "2026-02-30T21:07:56Z"'))
        errors = validate_repository(root)
        self.assertTrue(any("missing frontmatter `created`" in error for error in errors))
        self.assertTrue(any("`updated` is not a valid UTC date or timestamp" in error for error in errors))

    def test_date_only_values_are_accepted_and_compared_with_timestamps(self) -> None:
        plan = PLAN.replace('created: "2026-11-23T21:07:56Z"', 'created: "2026-11-23"')
        self.assertEqual(validate_repository(self._repository(plan)), [])

        plan = plan.replace('updated: "2026-11-23T21:07:56Z"', 'updated: "2026-11-22"')
        self.assertTrue(any("`updated` cannot precede `created`" in error for error in validate_repository(self._repository(plan))))

    def test_invalid_calendar_date_is_rejected(self) -> None:
        plan = PLAN.replace('created: "2026-11-23T21:07:56Z"', 'created: "2026-02-30"')
        self.assertTrue(any("`created` is not a valid UTC date or timestamp" in error for error in validate_repository(self._repository(plan))))

    def test_updated_must_not_precede_created_for_epics(self) -> None:
        root = self._repository()
        epic = root / ".wiki" / "coordination.md"
        epic.write_text(COORDINATION.replace('updated: "2026-11-23T21:07:56Z"', 'updated: "2026-11-22T21:07:56Z"'), encoding="utf-8")
        self.assertTrue(any("`updated` cannot precede `created`" in error for error in validate_repository(root)))

    def test_missing_phase_field_is_rejected(self) -> None:
        root = self._repository(PLAN.replace("- Handoff: Record the result.\n", ""))
        self.assertTrue(any("missing `Handoff`" in error for error in validate_repository(root)))

    def test_missing_portfolio_membership_is_rejected(self) -> None:
        root = self._repository()
        (root / ".wiki" / "parallel-execution.md").write_text("[Coordination](coordination.md)\n", encoding="utf-8")
        self.assertTrue(any("missing from parallel guide" in error for error in validate_repository(root)))

    def test_portfolio_count_mismatch_is_rejected(self) -> None:
        root = self._repository()
        index = root / ".wiki" / "index.md"
        index.write_text(index.read_text(encoding="utf-8").replace("contains 1 executable", "contains 2 executable"), encoding="utf-8")
        self.assertTrue(any("portfolio count" in error for error in validate_repository(root)))

    def test_unresolved_write_set_is_rejected(self) -> None:
        root = self._repository(PLAN.replace("`example.txt`", "TBD"))
        self.assertTrue(any("exact write set is unresolved" in error for error in validate_repository(root)))

    def test_valid_repository_passes(self) -> None:
        self.assertEqual(validate_repository(self._repository()), [])

    def test_zero_budget_is_rejected(self) -> None:
        root = self._repository(PLAN.replace("5 active hours maximum", "0 active hours maximum"))
        self.assertTrue(any("budget must be positive" in error for error in validate_repository(root)))


if __name__ == "__main__":
    unittest.main()
