import os, glob, json, textwrap, pathlib, subprocess, re, time, random
from datetime import datetime

# ---- CONFIG ----
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
MODEL = "gpt-4o"   # works well for code; you can change later
ROOT = pathlib.Path(__file__).resolve().parents[1]

# Validate ROOT points to correct project directory
if not (ROOT / "tasks").exists() or not (ROOT / "agent").exists():
    raise RuntimeError(f"ROOT seems wrong: {ROOT}")

AGENT_DIR = ROOT / "agent"
CONFIG = json.loads(json.dumps({}))  # placeholder if you expand
FILE_BLOCK_START = "<<<FILE:"
FILE_BLOCK_END = ">>>END"

def safe_run(cmd):
    """Run git command safely, masking tokens from error output"""
    try:
        out = subprocess.run(cmd, check=True, capture_output=True, text=True)
        return out
    except subprocess.CalledProcessError as e:
        clean = re.sub(r"https://[^@]+@", "https://***@", e.stderr or "")
        print(f"⚠️ Git error: {clean}")
        raise

def call_with_retry(func, max_tries=5):
    """Call function with exponential backoff retry logic"""
    delay = 5
    for attempt in range(max_tries):
        try:
            return func()
        except Exception as e:
            print(f"⚠️ Error: {e} (retrying in {delay}s)")
            if attempt < max_tries - 1:  # Don't sleep on last attempt
                time.sleep(delay)
                delay *= 2 * (1 + random.random())
            else:
                raise RuntimeError("❌ Max retries exceeded")

# ---- SIMPLE OPENAI CALLER (no extra installs needed on Replit if using requests) ----
import requests

def call_openai(messages, model=MODEL, temperature=0.2):
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type":"application/json"}
    payload = {"model": model, "messages": messages, "temperature": temperature}
    r = requests.post(url, headers=headers, json=payload, timeout=120)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]

# ---- HELPERS ----
def repo_tree(max_chars=4000):
    lines = []
    for p in ROOT.rglob("*"):
        if any(x in p.parts for x in [".git", "node_modules", ".next", "dist", "build", "__pycache__", ".venv"]):
            continue
        if p.is_file():
            rel = p.relative_to(ROOT).as_posix()
            if len(rel) < 200:
                lines.append(rel)
    out = "\n".join(sorted(lines))
    return out[:max_chars]

def read_file(path):
    try:
        return pathlib.Path(path).read_text(encoding="utf-8")
    except Exception:
        return ""

def apply_file_blocks(response_text):
    """Parses model output: blocks like
       <<<FILE: relative/path.ext
       ...new content...
       >>>END
    """
    changed = []
    text = response_text
    while True:
        start = text.find(FILE_BLOCK_START)
        if start == -1: break
        end = text.find(FILE_BLOCK_END, start)
        if end == -1: break
        header_end = text.find("\n", start)
        header = text[start:header_end]
        path = header.replace(FILE_BLOCK_START, "").strip().strip(":").strip()
        content = text[header_end+1:end]
        target = ROOT / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        changed.append(path)
        text = text[end+len(FILE_BLOCK_END):]
    return changed

def pick_next_task():
    pending = sorted(glob.glob(str(ROOT / "tasks/pending/*.md")))
    return pending[0] if pending else None

# ---- MAIN ----
def main():
    if not OPENAI_API_KEY:
        print("❌ OPENAI_API_KEY missing in Replit Secrets.")
        return

    task_file = pick_next_task()
    if not task_file:
        print("No tasks found in tasks/pending. Add a .md task and run again.")
        return

    task_text = read_file(task_file)
    tree = repo_tree()

    system = {
        "role":"system",
        "content": textwrap.dedent(f"""
        You are a senior full-stack engineer working on a payroll SaaS for Greek hospitality (EFKA, ΣΣΕ, Digital Work Card).
        You must produce STRICTLY structured output:
        1) A brief plan (bullet points).
        2) A TEST PLAN describing how to verify locally.
        3) One or more file blocks with FULL file contents using this exact format per file:
           {FILE_BLOCK_START} relative/path/filename.ext
           ...entire file content...
           {FILE_BLOCK_END}
        Rules:
        - Minimal, safe changes. Preserve code style and architecture.
        - If DB migrations are needed, include a migration file and instructions.
        - If unsure about a legal rule, add a TODO comment + assumption.
        """).strip()
    }

    user = {
        "role":"user",
        "content": textwrap.dedent(f"""
        TASK SPEC:
        ---
        {task_text}

        REPO TREE (truncated):
        ---
        {tree}
        """).strip()
    }

    print("🤖 Thinking…")
    resp = call_openai([system, user])
    changed = apply_file_blocks(resp)

    summary_path = f"agent/last_run_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
    pathlib.Path(summary_path).write_text(resp, encoding="utf-8")

    # Only move task to done if actual file changes were made
    if not changed:
        print("⚠️ No file changes detected. Task will remain in pending.")
        print(f"Summary saved → {summary_path}")
        print("Review the summary to understand why no changes were made.")
        return
    
    # Run validation checks before marking task complete
    print("🔍 Running TypeScript validation...")
    result = subprocess.run(["npm", "run", "tsc", "--", "--noEmit"], cwd=ROOT, capture_output=True)
    if result.returncode != 0:
        print("❌ TypeScript check failed. Task will remain in pending.")
        print(f"Summary saved → {summary_path}")
        print("Fix TypeScript errors and run again.")
        return

    print("🧪 Running tests...")
    tests = subprocess.run(["npm", "test", "--", "--bail"], cwd=ROOT, capture_output=True)
    if tests.returncode != 0:
        print("❌ Tests failed. Task will remain in pending.")
        print(f"Summary saved → {summary_path}")
        print("Fix failing tests and run again.")
        return
    
    print("✅ All validation checks passed!")
    
    # Move task to done
    done_path = task_file.replace(str(ROOT / "tasks/pending"), str(ROOT / "tasks/done"))
    pathlib.Path(done_path).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(task_file).rename(done_path)

    print("\n✅ Agent run complete.")
    print(f"Changed files: {changed or 'None (review summary)'}")
    print(f"Summary saved → {summary_path}")
    print(f"Task moved to → {done_path}")
    print("\nNext steps:")
    print("1) Open the summary file in /agent to review the plan & TEST PLAN.")
    print("2) Open changed files, scan quickly, then click ▶ Run app to test.")
    print("3) Commit to dev branch, open a PR, and merge after tests pass.")

if __name__ == "__main__":
    main()