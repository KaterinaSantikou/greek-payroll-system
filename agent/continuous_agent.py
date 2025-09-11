import time, shutil, random, pathlib, subprocess
from run_agent import main as run_once

ROOT = pathlib.Path(".")
BACKLOG = ROOT / "tasks/backlog"
PENDING = ROOT / "tasks/pending"

def pick_backlog_item():
    ideas = (BACKLOG / "improvement_ideas.md").read_text(encoding="utf-8").splitlines()
    ideas = [i for i in ideas if i.strip() and not i.strip().startswith("#")]
    return random.choice(ideas).strip() if ideas else None

while True:
    # If there is already a pending task, just run it
    if any(PENDING.glob("*.md")):
        print("🛠 Found a pending task — running agent...")
        run_once()
    else:
        idea = pick_backlog_item()
        if idea:
            print(f"📝 Creating task from backlog idea: {idea}")
            fname = f"tasks/pending/{int(time.time())}-auto.md"
            pathlib.Path(fname).write_text(f"# Auto-generated Task\n\n**Business Context:**\n{idea}\n\n**Acceptance Criteria:**\n- [ ] Agent decides details.\n", encoding="utf-8")
        else:
            print("💤 No backlog ideas left.")
    
    print("⏳ Sleeping 1 hour...")
    time.sleep(3600)