import os
import time
import glob

def main():
    pending_dir = "tasks/pending"
    done_dir = "tasks/done"

    # Find .md tasks in pending
    tasks = glob.glob(f"{pending_dir}/*.md")
    if not tasks:
        print("✅ No pending tasks found.")
        return

    for task_path in tasks:
        task_name = os.path.basename(task_path)
        print(f"🚀 Processing task: {task_name}")

        # Read task content
        with open(task_path, "r", encoding="utf-8") as f:
            spec = f.read()

        # ---- PLACEHOLDER ----
        # Here is where you call your AI model or dev agent logic
        # For now, just simulate with a message
        print("🧠 Simulating AI development on this task...")
        time.sleep(2)
        print("✅ Task complete (simulated)")

        # Move to done/
        os.rename(task_path, os.path.join(done_dir, task_name))

if __name__ == "__main__":
    main()