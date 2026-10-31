"""Grade observable wiki state in an isolated Waza task workspace."""
from pathlib import Path
import os
import re
import sys

root = Path(os.environ["WAZA_WORKSPACE_DIR"])
mode = sys.argv[1]

def read(path):
    target = root / path
    return target.read_text() if target.is_file() else ""

def require(condition, message):
    if not condition:
        print(message, file=sys.stderr)
        raise SystemExit(1)

require(read("guard.txt") == "leave this alone\n", "guard file changed")
index = read(".wiki/index.md")
network = read(".wiki/plan-network.md")
lane = read(".wiki/parallel-execution.md")
if mode == "create":
    plans = [p for p in (root / ".wiki").glob("*.md") if p.name not in {"index.md", "plan-network.md", "parallel-execution.md"}]
    require(len(plans) == 1, "expected one new plan")
    plan = plans[0].read_text()
    for needle in ("execution: phased", "phase_budget_hours: 5", "Exact write set", "Primary integration lock", "Focused validation", "Handoff"):
        require(needle.lower() in plan.lower(), f"missing {needle}")
    require(re.search(r"Status: (ready|planned)", plan, re.I), "missing active phase")
    for text in (index, network, lane):
        require("csv" in text.lower() or plans[0].stem.lower() in text.lower(), "cross-index missing export")
elif mode == "prune":
    plan = read(".wiki/csv-export.md")
    require("CSV-02" in plan and "CSV-01" not in plan, "completed phase retained or stable ID lost")
    require("src/export.py" not in plan, "completed implementation retained as task")
    require(re.search(r"^status:\s*planned\s*$", plan, re.M), "plan remains in progress after its active phase was pruned")
    for text in (index, network, lane):
        require("CSV-02" in text and "CSV-01" not in text, "stale cross-index phase")
elif mode == "blocked":
    plan = read(".wiki/api-sync.md")
    require("API-02" in plan and "API-01" not in plan, "blocked phase lost or completed phase retained")
    require("blocked" in plan.lower() and "credential" in plan.lower(), "blocked prerequisite lost")
    for text in (index, network, lane):
        require("API-02" in text and "API-01" not in text, "stale cross-index phase")
else:
    raise SystemExit(f"unknown mode {mode}")
print(f"{mode} wiki state verified")
