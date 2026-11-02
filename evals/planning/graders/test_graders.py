"""Regression tests for planning evaluation program graders."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


GRADERS = Path(__file__).parent


def run_grader(script: str, mode: str, files: dict[str, str]) -> subprocess.CompletedProcess[str]:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        for relative, content in files.items():
            target = root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content)
        environment = os.environ.copy()
        environment["WAZA_WORKSPACE_DIR"] = str(root)
        return subprocess.run(
            ["python3", str(GRADERS / script), mode],
            capture_output=True,
            env=environment,
            text=True,
        )


class PlanningGraderTests(unittest.TestCase):
    def test_prune_allows_completed_fact_only_in_current_evidence(self) -> None:
        result = run_grader(
            "wiki_state.py",
            "prune",
            {
                "guard.txt": "leave this alone\n",
                ".wiki/csv-export.md": (
                    "---\nstatus: planned\n---\n"
                    "# CSV export\n\nCurrent evidence: `src/export.py` is implemented.\n\n"
                    "# Execution phases\n\n## CSV-02 — Browser download\n"
                ),
                ".wiki/index.md": "CSV-02\n",
                ".wiki/plan-network.md": "CSV-02\n",
                ".wiki/parallel-execution.md": "CSV-02\n",
            },
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_prune_rejects_completed_phase_and_write_set(self) -> None:
        result = run_grader(
            "wiki_state.py",
            "prune",
            {
                "guard.txt": "leave this alone\n",
                ".wiki/csv-export.md": (
                    "---\nstatus: in-progress\n---\n# Execution phases\n"
                    "## CSV-01 — Export helper\n- Exact write set: src/export.py\n"
                    "## CSV-02 — Browser download\n"
                ),
                ".wiki/index.md": "CSV-01 and CSV-02\n",
                ".wiki/plan-network.md": "CSV-01 precedes CSV-02\n",
                ".wiki/parallel-execution.md": "CSV-01\n",
            },
        )
        self.assertNotEqual(result.returncode, 0)

    def test_implementation_accepts_documented_subtract_contract(self) -> None:
        result = run_grader(
            "artifact_state.py",
            "implementation",
            {
                "guard.txt": "leave this alone\n",
                "calc.py": "def subtract(a, b):\n    return a - b\n",
                "progress.md": (
                    "## Unrelated work\nKeep this section.\n\n"
                    "CALC-02 complete; focused test passed.\n"
                ),
                "tests/test_calc.py": (
                    "import unittest\nfrom calc import subtract\n\n"
                    "class TestCalc(unittest.TestCase):\n"
                    "    def test_subtract(self):\n"
                    "        self.assertEqual(subtract(5, 3), 2)\n"
                ),
            },
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_implementation_rejects_missing_subtraction(self) -> None:
        result = run_grader(
            "artifact_state.py",
            "implementation",
            {
                "guard.txt": "leave this alone\n",
                "calc.py": "def add(a, b):\n    return a + b\n",
                "progress.md": "## Unrelated work\nKeep this section.\n\nCALC-02 test pending.\n",
                "tests/test_calc.py": "",
            },
        )
        self.assertNotEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
