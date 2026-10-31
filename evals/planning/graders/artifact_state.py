"""Grade final artifacts in a Waza task workspace, without judging agent prose."""
from pathlib import Path
import os
import subprocess
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

require(read("guard.txt") == "leave this alone\n", "guard changed")
if mode == "implementation":
    code = read("calc.py")
    progress = read("progress.md")
    require("def sub(" in code and "return a - b" in code, "subtraction absent")
    require("## Unrelated work\nKeep this section." in progress, "unrelated progress removed")
    require("CALC-02" in progress and "test" in progress.lower(), "handoff incomplete")
    result = subprocess.run(["python3", "-m", "unittest", "discover", "-s", "tests"], cwd=root, capture_output=True, text=True)
    require(result.returncode == 0, result.stderr)
elif mode in {"draft", "resume-draft", "review"}:
    article = read("drafts/article.md")
    checks = read("drafts/checks.md")
    if mode == "review":
        original = "# Arbor Library\nThe library opens at 09:00 on weekdays. It closes at 18:00 on weekdays. It opens Sundays.\n"
        require(article == original, "review changed draft")
        for verdict in ("verified", "incorrect", "unresolved"):
            require(verdict in checks.lower(), f"missing {verdict} verdict")
        require("17:00" in checks and "18:00" in checks, "correction omitted")
        require("sunday" in checks.lower() and "evidence" in checks.lower(), "missing-evidence note omitted")
    else:
        require(read("drafts/outline.md"), "outline missing")
        require(article and checks and read("progress.md"), "draft, checks, or progress missing")
        require("09:00" in article and "17:00" in article, "supported hours missing")
        require("verified" in checks.lower() and "unresolved" in checks.lower(), "verdicts incomplete")
        require("sunday" in checks.lower() and "evidence" in checks.lower(), "missing Sunday evidence omitted")
        require("sources/library-record.md" in checks or "board record" in checks.lower(), "source location absent")
        if mode == "resume-draft":
            require(read("drafts/outline.md") == "# Outline\n1. Weekday hours\n2. Sunday uncertainty\n", "outline changed during resume")
else:
    raise SystemExit(f"unknown mode {mode}")
print(f"{mode} artifacts verified")
