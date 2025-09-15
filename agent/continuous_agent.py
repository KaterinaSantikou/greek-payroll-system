import time, pathlib, sys, subprocess, re, os, random
from agent.run_agent import main as run_once

def safe_run(cmd):
    """Run git command safely, masking tokens from error output"""
    try:
        out = subprocess.run(cmd, check=True, capture_output=True, text=True)
        return out
    except subprocess.CalledProcessError as e:
        clean = re.sub(r"https://[^@]+@", "https://***@", e.stderr or "")
        print(f"⚠️ Git error: {clean}")
        raise

def call_with_retry(func, max_tries=3):
    """Call function with exponential backoff retry logic"""
    delay = 10
    for attempt in range(max_tries):
        try:
            return func()
        except Exception as e:
            print(f"⚠️ Agent error: {e}")
            if attempt < max_tries - 1:  # Don't sleep on last attempt
                print(f"🔄 Retrying in {delay}s...")
                time.sleep(delay)
                delay *= 2 * (1 + random.random())
            else:
                print("❌ Max retries exceeded, continuing to next cycle")

ROOT = pathlib.Path(".")
BACKLOG_DIR = ROOT / "tasks" / "backlog"
PENDING = ROOT / "tasks" / "pending"
DONE = ROOT / "tasks" / "done"
LOCKFILE = ROOT / ".agent.lock"

BACKLOG_FILES = [
    BACKLOG_DIR / "analytical_improvements.md"
]

GITHUB_REPO = "KaterinaSantikou/greek-payroll-system"  # Updated to your actual repo

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
    """Return True if all backlog files are empty or missing"""
    def has_ideas(fp):
        return fp.exists() and any(l.strip() and not l.startswith("#") for l in fp.read_text(encoding="utf-8").splitlines())
    return not any(has_ideas(bf) for bf in BACKLOG_FILES)

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

# Concurrency protection - ensure only one agent instance runs
if LOCKFILE.exists():
    print("⚠️ Agent already running. Exiting.")
    sys.exit(1)

LOCKFILE.touch()
print(f"🔒 Agent lock acquired: {LOCKFILE}")

try:
    while True:
        if backlog_empty() and not any(PENDING.glob("*.md")):
            print("✅ All backlog tasks are complete. No tasks left to build. Exiting cleanly.")
            sys.exit(0)

        if any(PENDING.glob("*.md")):
            print("🛠 Found a pending task — running agent...")
            call_with_retry(run_once)
        else:
            # Pick from the first available backlog file
            idea = None
            label = "Analytical"
            for backlog_file in BACKLOG_FILES:
                idea = pop_first_idea(backlog_file)
                if idea:
                    break

            if idea:
                print(f"📝 Creating {label} task from backlog idea: {idea}")
                task_name = f"{int(time.time())}-{label.lower()}.md"
                task_path = PENDING / task_name
                task_path.write_text(
                    f"# Task: {idea}\n\n**Business Context:**\n{idea}\n\n**Acceptance Criteria:**\n- [ ] Agent decides details.\n",
                    encoding="utf-8"
                )
                print("🚀 Running agent immediately on new task...")
                call_with_retry(run_once)
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
            safe_run(["git", "config", "--global", "user.name", "AI Dev Agent"])
            safe_run(["git", "config", "--global", "user.email", "agent@localhost"])
            
            # Ensure dev branch exists and switch to it
            safe_run(["git", "fetch"])
            result = safe_run(["git", "branch", "--list", "dev"])
            if "dev" not in result.stdout:
                print("📝 Creating new dev branch...")
                safe_run(["git", "checkout", "-b", "dev"])
            else:
                print("🔄 Switching to existing dev branch...")
                safe_run(["git", "checkout", "dev"])
            
            safe_run(["git", "add", "."])
            
            # Check if there are actually changes to commit
            diff_result = subprocess.run(["git", "diff", "--quiet", "--cached"], capture_output=True)
            if diff_result.returncode == 0:
                print("⚠️ No changes to commit, skipping.")
                return
            
            safe_run(["git", "commit", "-m", f"AI Agent: Completed task — {task_title}"])
            safe_run([
                "git",
                "push",
                f"https://{os.environ.get('GITHUB_TOKEN')}@github.com/{GITHUB_REPO}.git",
                "dev"
            ])
            print("✅ Pushed to dev branch.")
        except subprocess.CalledProcessError:
            print("⚠️ Git push failed (see error above)")  # Error already printed by safe_run

        print("✅ Cycle complete — checking again immediately...\n")
        time.sleep(5)

finally:
    print("🔓 Releasing agent lock...")
    LOCKFILE.unlink(missing_ok=True)