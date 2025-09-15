import time, random, pathlib
from agent.run_agent import main as run_once

ROOT = pathlib.Path(".")
BACKLOG_DIR = ROOT / "tasks" / "backlog"
PENDING = ROOT / "tasks" / "pending"

BACKLOG_FILES = [
    BACKLOG_DIR / "improvement_ideas.md",
    BACKLOG_DIR / "ui_ux_improvement_ideas.md"
]

def pick_backlog_item():
    all_ideas = []
    for backlog in BACKLOG_FILES:
        if backlog.exists():
            lines = backlog.read_text(encoding="utf-8").splitlines()
            # Skip empty lines and headings
            ideas = [l.strip() for l in lines if l.strip() and not l.startswith("#")]
            all_ideas.extend(ideas)
    if not all_ideas:
        return None
    return random.choice(all_ideas)

while True:
    if any(PENDING.glob("*.md")):
        print("🛠 Found a pending task — running agent...")
        run_once()
    else:
        idea = pick_backlog_item()
        if idea:
            print(f"📝 Creating task from backlog idea: {idea}")
            task_name = f"{int(time.time())}-auto.md"
            task_path = PENDING / task_name
            task_path.write_text(
                f"# Auto-generated Task\n\n**Business Context:**\n{idea}\n\n**Acceptance Criteria:**\n- [ ] Agent decides details.\n",
                encoding="utf-8"
            )
        else:
            print("💤 No backlog ideas found in either file.")
    
    print("⏳ Sleeping 1 hour...")
    time.sleep(3600)