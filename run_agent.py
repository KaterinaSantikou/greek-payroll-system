import os
import time
import glob

def main():
    pending_dir = "tasks/pending"
    done_dir = "tasks/done"

    tasks = glob.glob(f"{pending_dir}/*.md")
    if not tasks:
        print("✅ No pending tasks found.")
        return

    for task_path in tasks:
        task_name = os.path.basename(task_path)
        print(f"🚀 Processing task: {task_name}")

        with open(task_path, "r", encoding="utf-8") as f:
            spec = f.read()

        # This is just a placeholder
        print("🧠 Simulating AI development on this task...")
        time.sleep(2)
        print("✅ Task complete (simulated)")

        # Move task to done/
        os.rename(task_path, os.path.join(done_dir, task_name))

if __name__ == "__main__":
    main()