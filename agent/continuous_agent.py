import time, pathlib, sys, subprocess, re, os
from agent.run_agent import main as run_once

ROOT = pathlib.Path(".")
BACKLOG_DIR = ROOT / "tasks" / "backlog"
PENDING = ROOT / "tasks" / "pending"
DONE = ROOT / "tasks" / "done"

LOGIC_FILE = BACKLOG_DIR / "improvement_ideas.md"
UI_FILE = BACKLOG_DIR / "ui_ux_improvement_ideas.md"

GITHUB_REPO = "KaterinaSantikou/greek-payroll-system"  # Updated to your actual repo

next_type = "logic"

def pop_first_idea(file_path):
    """Read the first idea from the backlog file, remove it, and return it"""
    if not file_path.exists():
        return None
    lines = [l.strip() for l in file_path.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]
    if not lines:
        return None
    first = lines[0]
    remaining = "\n".join(lines[1:])
    file_path.write_text(remaining, encoding="utf-8")
    return first

def backlog_empty():
    """Return True if both backlog files are empty or missing"""
    def has_ideas(fp):
        return fp.exists() and any(l.strip() and not l.startswith("#") for l in fp.read_text(encoding="utf-8").splitlines())
    return not has_ideas(LOGIC_FILE) and not has_ideas(UI_FILE)

def get_last_done_task_title():
    """Get the title from the most recently completed .md file in /done"""
    done_tasks = sorted(DONE.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not done_tasks:
        return "unknown task"
    content = done_tasks[0].read_text(encoding="utf-8")
    match = re.search(r"#\s*Task:?\s*(.+)", content, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return done_tasks[0].stem

while True:
    if backlog_empty() and not any(PENDING.glob("*.md")):
        print("✅ All backlog tasks are complete. No tasks left to build. Exiting cleanly.")
        sys.exit(0)

    if any(PENDING.glob("*.md")):
        print("🛠 Found a pending task — running agent...")
        run_once()
    else:
        if next_type == "logic":
            idea = pop_first_idea(LOGIC_FILE)
            label = "Logic"
            next_type = "ui"
        else:
            idea = pop_first_idea(UI_FILE)
            label = "UI/UX"
            next_type = "logic"

        if idea:
            print(f"📝 Creating {label} task from backlog idea: {idea}")
            task_name = f"{int(time.time())}-{label.lower()}.md"
            task_path = PENDING / task_name
            task_path.write_text(
                f"# Task: {idea}\n\n**Business Context:**\n{idea}\n\n**Acceptance Criteria:**\n- [ ] Agent decides details.\n",
                encoding="utf-8"
            )
            print("🚀 Running agent immediately on new task...")
            run_once()
        else:
            print(f"💤 No {label} backlog ideas left.")
            print("⏳ Waiting 10 seconds before checking again...")
            time.sleep(10)
            continue

    # ---- Auto commit and push to GitHub ----
    task_title = get_last_done_task_title()
    
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        print("❌ No GITHUB_TOKEN found in Replit Secrets. Please add it first.")
    else:
        try:
            print(f"💾 Committing and pushing changes to dev branch (task: {task_title})...")
            subprocess.run(["git", "config", "--global", "user.name", "AI Dev Agent"], check=True)
            subprocess.run(["git", "config", "--global", "user.email", "agent@localhost"], check=True)
            subprocess.run(["git", "checkout", "dev"], check=False)
            subprocess.run(["git", "add", "."], check=True)
            subprocess.run(["git", "commit", "-m", f"AI Agent: Completed task — {task_title}"], check=False)
            subprocess.run([
                "git",
                "push",
                f"https://{token}@github.com/KaterinaSantikou/greek-payroll-system.git",
                "dev"
            ], check=True)
            print("✅ Pushed to dev branch.")
        except subprocess.CalledProcessError as e:
            print(f"⚠️ Git push failed: {e}")

    print("✅ Cycle complete — checking again immediately...\n")
    time.sleep(5)