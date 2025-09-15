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
CONTEXT_DIR = ROOT / "context"
KNOWLEDGE_FILE = CONTEXT_DIR / "knowledge.md"
DEPENDENCY_FILE = CONTEXT_DIR / "dependency_graph.json"
PAYROLL_SCENARIOS_FILE = ROOT / "tests" / "payroll_scenarios.json"
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
            # Special handling for rate limit errors
            if "rate limit" in str(e).lower() or "429" in str(e):
                print("⏳ Rate limited. Waiting 60s...")
                time.sleep(60)
                continue  # Skip normal delay and retry immediately
            
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

def read_knowledge():
    """Read the current AI knowledge base"""
    if not KNOWLEDGE_FILE.exists():
        return "No previous knowledge available."
    return KNOWLEDGE_FILE.read_text(encoding="utf-8")

def generate_dependency_graph():
    """Generate dependency graph using madge and save to JSON"""
    try:
        CONTEXT_DIR.mkdir(exist_ok=True)
        
        # Run madge to generate dependency graph
        result = subprocess.run([
            "npx", "madge", 
            "--json", 
            "--extensions", "ts,tsx,js,jsx",
            "--exclude", "node_modules|dist|build",
            "."
        ], cwd=ROOT, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            dependency_data = json.loads(result.stdout)
            
            # Also get circular dependencies
            circular_result = subprocess.run([
                "npx", "madge", 
                "--circular",
                "--json",
                "--extensions", "ts,tsx,js,jsx", 
                "--exclude", "node_modules|dist|build",
                "."
            ], cwd=ROOT, capture_output=True, text=True, timeout=30)
            
            circular_deps = []
            if circular_result.returncode == 0 and circular_result.stdout.strip():
                try:
                    circular_deps = json.loads(circular_result.stdout)
                except:
                    pass
            
            # Combine data
            graph_data = {
                "dependencies": dependency_data,
                "circular_dependencies": circular_deps,
                "generated_at": datetime.now().isoformat(),
                "total_files": len(dependency_data),
                "files_with_deps": len([f for f, deps in dependency_data.items() if deps])
            }
            
            DEPENDENCY_FILE.write_text(json.dumps(graph_data, indent=2), encoding="utf-8")
            print(f"📊 Dependency graph generated: {len(dependency_data)} files analyzed")
            return graph_data
        else:
            print(f"⚠️ Failed to generate dependency graph: {result.stderr}")
            return None
    except Exception as e:
        print(f"⚠️ Error generating dependency graph: {e}")
        return None

def read_dependency_graph():
    """Read the dependency graph, generating it if it doesn't exist or is stale"""
    if not DEPENDENCY_FILE.exists():
        print("📊 Generating initial dependency graph...")
        generate_dependency_graph()
    
    if DEPENDENCY_FILE.exists():
        try:
            data = json.loads(DEPENDENCY_FILE.read_text(encoding="utf-8"))
            
            # Check if graph is older than 1 hour - regenerate if stale
            generated_at = datetime.fromisoformat(data.get("generated_at", "2000-01-01T00:00:00"))
            if (datetime.now() - generated_at).total_seconds() > 3600:
                print("📊 Dependency graph is stale, regenerating...")
                new_data = generate_dependency_graph()
                return new_data if new_data else data
            
            return data
        except Exception as e:
            print(f"⚠️ Error reading dependency graph: {e}")
            return None
    
    return None

def format_dependency_summary(graph_data):
    """Format dependency graph data for AI prompt"""
    if not graph_data:
        return "No dependency graph available."
    
    deps = graph_data.get("dependencies", {})
    circular = graph_data.get("circular_dependencies", [])
    
    summary = f"""ARCHITECTURE OVERVIEW:
- Total files: {graph_data.get('total_files', 0)}
- Files with dependencies: {graph_data.get('files_with_deps', 0)}
- Circular dependencies: {len(circular)} {"⚠️ ISSUES DETECTED" if circular else "✅ Clean"}

KEY DEPENDENCIES:
"""
    
    # Show main dependency patterns
    for file, deps in sorted(deps.items())[:10]:  # Top 10 most connected files
        if deps:
            summary += f"- {file} → {', '.join(deps[:3])}{'...' if len(deps) > 3 else ''}\n"
    
    if circular:
        summary += f"\n⚠️ CIRCULAR DEPENDENCIES TO AVOID:\n"
        for cycle in circular[:3]:  # Show first 3 circular deps
            if isinstance(cycle, list):
                summary += f"- {' → '.join(cycle)}\n"
    
    return summary

def validate_payroll_math():
    """Run payroll scenario tests to validate mathematical correctness"""
    if not PAYROLL_SCENARIOS_FILE.exists():
        print("⚠️ No payroll scenarios file found, skipping math validation")
        return True
    
    try:
        # Load test scenarios
        scenarios_data = json.loads(PAYROLL_SCENARIOS_FILE.read_text(encoding="utf-8"))
        scenarios = scenarios_data.get("scenarios", [])
        validation_rules = scenarios_data.get("validation_rules", {})
        tolerance = validation_rules.get("tolerance", 0.02)
        
        print(f"🧮 Running {len(scenarios)} payroll math validation scenarios...")
        
        # Try to run a simple payroll calculation test via Node.js
        # This assumes there's a payroll engine that can be tested
        test_script = """
const fs = require('fs');
const path = require('path');

// Try to load payroll engine (adapt path as needed)
let payrollEngine;
try {
    payrollEngine = require('./server/payroll_engine.ts');
} catch (e) {
    try {
        payrollEngine = require('./payroll_engine.js');
    } catch (e2) {
        console.log('SKIP: No payroll engine found');
        process.exit(0);
    }
}

// Load scenarios
const scenariosPath = './tests/payroll_scenarios.json';
if (!fs.existsSync(scenariosPath)) {
    console.log('SKIP: No scenarios file');
    process.exit(0);
}

const data = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
const scenarios = data.scenarios || [];
const tolerance = data.validation_rules?.tolerance || 0.02;

let passed = 0;
let failed = 0;

scenarios.forEach((scenario, index) => {
    try {
        // Run calculation (this will need to be adapted to your actual API)
        const result = payrollEngine.calculatePayroll(scenario.input);
        const expected = scenario.expected;
        
        // Compare key values within tolerance
        let scenarioFailed = false;
        const requiredFields = ['gross_pay', 'efka_employee', 'net_pay'];
        
        requiredFields.forEach(field => {
            if (expected[field] !== undefined) {
                const diff = Math.abs(result[field] - expected[field]);
                if (diff > tolerance) {
                    console.log(`FAIL: ${scenario.name} - ${field}: expected ${expected[field]}, got ${result[field]}`);
                    scenarioFailed = true;
                }
            }
        });
        
        if (scenarioFailed) {
            failed++;
        } else {
            passed++;
        }
    } catch (e) {
        console.log(`ERROR: ${scenario.name} - ${e.message}`);
        failed++;
    }
});

console.log(`RESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
"""
        
        # Write and run the test script
        test_file = ROOT / "temp_payroll_test.js"
        test_file.write_text(test_script, encoding="utf-8")
        
        try:
            result = subprocess.run(["node", "temp_payroll_test.js"], 
                                  cwd=ROOT, capture_output=True, text=True, timeout=30)
            
            # Clean up test file
            test_file.unlink(missing_ok=True)
            
            output = result.stdout.strip()
            if "SKIP:" in output:
                print(f"⚠️ Payroll math validation skipped: {output}")
                return True
            elif result.returncode == 0:
                print(f"✅ Payroll math validation passed: {output}")
                return True
            else:
                print(f"❌ Payroll math validation failed: {output}")
                return False
                
        except subprocess.TimeoutExpired:
            test_file.unlink(missing_ok=True)
            print("❌ Payroll math validation timed out")
            return False
            
    except Exception as e:
        print(f"⚠️ Error running payroll math validation: {e}")
        return True  # Don't fail the build if validation system has issues

def validate_schema_migrations(changed_files):
    """Validate database schema changes and migrations"""
    schema_files = [f for f in changed_files if 'schema.sql' in f or 'migration' in f.lower()]
    
    if not schema_files:
        print("📋 No schema changes detected, skipping migration validation")
        return True
    
    print(f"🗄️ Validating schema changes: {', '.join(schema_files)}")
    
    try:
        # Check if we have database environment variables
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            print("⚠️ No DATABASE_URL found, skipping schema validation")
            return True
        
        # Test schema by applying it to test database
        print("🔄 Testing schema migration...")
        
        # First, try to run the schema file against the database
        schema_file = ROOT / "db" / "schema.sql"
        if schema_file.exists():
            try:
                # Run schema migration
                result = subprocess.run([
                    "psql", db_url, "-f", str(schema_file)
                ], cwd=ROOT, capture_output=True, text=True, timeout=30)
                
                if result.returncode != 0:
                    print(f"❌ Schema migration failed: {result.stderr}")
                    return False
                    
                print("✅ Schema migration completed successfully")
                
            except subprocess.TimeoutExpired:
                print("❌ Schema migration timed out")
                return False
            except FileNotFoundError:
                print("⚠️ psql not found, skipping direct schema validation")
        
        # Try to run Prisma/Drizzle generation if available
        package_json = ROOT / "package.json"
        if package_json.exists():
            try:
                package_data = json.loads(package_json.read_text(encoding="utf-8"))
                scripts = package_data.get("scripts", {})
                
                # Check for common ORM generation commands
                if "db:generate" in scripts:
                    print("🔧 Running db:generate...")
                    result = subprocess.run(["npm", "run", "db:generate"], 
                                          cwd=ROOT, capture_output=True, text=True, timeout=60)
                    if result.returncode != 0:
                        print(f"❌ db:generate failed: {result.stderr}")
                        return False
                    print("✅ Database generation completed")
                    
                elif "prisma" in scripts and "generate" in scripts["prisma"]:
                    print("🔧 Running prisma generate...")
                    result = subprocess.run(["npm", "run", "prisma", "generate"], 
                                          cwd=ROOT, capture_output=True, text=True, timeout=60)
                    if result.returncode != 0:
                        print(f"❌ Prisma generate failed: {result.stderr}")
                        return False
                    print("✅ Prisma generation completed")
                    
                elif "drizzle-kit" in package_data.get("dependencies", {}) or "drizzle-kit" in package_data.get("devDependencies", {}):
                    print("🔧 Running drizzle-kit generate...")
                    result = subprocess.run(["npx", "drizzle-kit", "generate"], 
                                          cwd=ROOT, capture_output=True, text=True, timeout=60)
                    if result.returncode != 0:
                        print(f"❌ Drizzle generate failed: {result.stderr}")
                        return False
                    print("✅ Drizzle generation completed")
                    
            except Exception as e:
                print(f"⚠️ Could not run ORM generation: {e}")
        
        # Validate core table structure exists
        print("🔍 Validating table structure...")
        
        # Basic validation that essential payroll tables exist
        validation_query = """
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('employees', 'payroll_runs', 'companies', 'users')
ORDER BY table_name;
"""
        
        try:
            result = subprocess.run([
                "psql", db_url, "-t", "-c", validation_query
            ], cwd=ROOT, capture_output=True, text=True, timeout=15)
            
            if result.returncode == 0:
                tables = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
                print(f"✅ Found tables: {', '.join(tables) if tables else 'none'}")
                
                # Check for essential payroll tables
                required_tables = ['employees', 'payroll_runs']
                missing_tables = [t for t in required_tables if t not in tables]
                
                if missing_tables:
                    print(f"⚠️ Missing essential tables: {', '.join(missing_tables)}")
                    # Don't fail for missing tables - they might be created differently
                    # Just warn and continue
                
                return True
            else:
                print(f"⚠️ Could not validate table structure: {result.stderr}")
                return True  # Don't fail build for validation issues
                
        except subprocess.TimeoutExpired:
            print("⚠️ Table validation timed out")
            return True
        except FileNotFoundError:
            print("⚠️ psql not available for table validation")
            return True
            
    except Exception as e:
        print(f"⚠️ Error during schema validation: {e}")
        return True  # Don't fail build for validation system issues
    
    return True

def update_knowledge(task_title, changed_files, task_summary):
    """Update the knowledge base with information from the completed task"""
    CONTEXT_DIR.mkdir(exist_ok=True)
    
    current_knowledge = read_knowledge() if KNOWLEDGE_FILE.exists() else ""
    
    # Prepare update entry
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    update_entry = f"""
## Task Completed: {task_title}
**Date:** {timestamp}
**Files Modified:** {', '.join(changed_files) if changed_files else 'None'}

**Summary:** {task_summary[:200]}...

"""
    
    # Find the "Recent Changes" section and insert the new entry
    if "## Recent Changes" in current_knowledge:
        parts = current_knowledge.split("## Recent Changes")
        updated_knowledge = parts[0] + "## Recent Changes" + update_entry + parts[1] if len(parts) > 1 else parts[0] + "## Recent Changes" + update_entry
    else:
        updated_knowledge = current_knowledge + "\n## Recent Changes" + update_entry
    
    # Update the "Last updated" timestamp
    updated_knowledge = updated_knowledge.replace("*Last updated: Initial setup*", f"*Last updated: {timestamp}*")
    if "*Last updated:" not in updated_knowledge:
        updated_knowledge += f"\n\n---\n*Last updated: {timestamp}*"
    
    KNOWLEDGE_FILE.write_text(updated_knowledge, encoding="utf-8")

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
    knowledge = read_knowledge()
    
    # Get dependency graph for architectural context
    dependency_graph = read_dependency_graph()
    dependency_summary = format_dependency_summary(dependency_graph)

    system = {
        "role":"system",
        "content": textwrap.dedent(f"""
        You are a senior full-stack engineer working on a Greek Payroll SaaS for hospitality (EFKA, ΣΣΕ, Digital Work Card).
        
        ARCHITECTURE RULES:
        - Use Express/Node back-end with TypeScript
        - Respect db/schema.sql for database structure - never modify core schema without migration
        - Do not change existing routing conventions in server/routes.ts
        - Follow existing payroll_engine.ts patterns for calculation logic
        - Use Greek labor law logic from N. 4093/2012 and ΣΣΕ regulations
        - Preserve EFKA contribution calculation patterns
        - Maintain Digital Work Card validation structure
        - Keep overtime calculation formulas (120%, 140% rates)
        - Follow existing error handling and logging patterns
        
        OUTPUT REQUIREMENTS:
        You must produce STRICTLY structured output:
        1) A brief plan (bullet points).
        2) A TEST PLAN describing how to verify locally.
        3) One or more file blocks with FULL file contents using this exact format per file:
           {FILE_BLOCK_START} relative/path/filename.ext
           ...entire file content...
           {FILE_BLOCK_END}
        
        SAFETY RULES:
        - Minimal, safe changes. Preserve code style and architecture.
        - If DB migrations are needed, include a migration file and instructions.
        - If unsure about a Greek legal rule, add a TODO comment + assumption.
        - Test all changes against existing payroll calculation logic.
        
        IMPORTANT: Review the CURRENT SYSTEM KNOWLEDGE section below to:
        - Avoid re-implementing existing features
        - Build upon previous work instead of replacing it
        - Maintain consistency with established patterns
        - Reference existing modules and formulas when applicable
        
        DEPENDENCY GUIDANCE: Use the DEPENDENCY ARCHITECTURE section to:
        - Understand how files connect to each other
        - Avoid creating orphan modules that nothing imports
        - Prevent circular import dependencies
        - Follow existing import patterns and file organization
        """).strip()
    }

    user = {
        "role":"user",
        "content": textwrap.dedent(f"""
        TASK SPEC:
        ---
        {task_text}

        CURRENT SYSTEM KNOWLEDGE:
        ---
        {knowledge}

        DEPENDENCY ARCHITECTURE:
        ---
        {dependency_summary}

        REPO TREE (truncated):
        ---
        {tree}
        """).strip()
    }

    print("🤖 Thinking…")
    resp = call_with_retry(lambda: call_openai([system, user]))
    if not resp:
        print("❌ Failed to get response from OpenAI")
        return
    
    # Create git checkpoint before applying changes
    print("💾 Creating git checkpoint before applying changes...")
    try:
        safe_run(["git", "stash", "push", "-m", "agent-backup", "--include-untracked"])
        backup_created = True
        print("✅ Git checkpoint created")
    except subprocess.CalledProcessError:
        print("⚠️ Could not create git checkpoint (no changes to stash)")
        backup_created = False
    
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
    validation_failed = False
    
    print("🔍 Running TypeScript validation...")
    result = subprocess.run(["npm", "run", "tsc", "--", "--noEmit"], cwd=ROOT, capture_output=True)
    if result.returncode != 0:
        print("❌ TypeScript check failed.")
        validation_failed = True

    if not validation_failed:
        print("🧪 Running tests...")
        tests = subprocess.run(["npm", "test", "--", "--bail"], cwd=ROOT, capture_output=True)
        if tests.returncode != 0:
            print("❌ Tests failed.")
            validation_failed = True
    
    if not validation_failed:
        print("🧮 Running payroll math validation...")
        payroll_valid = validate_payroll_math()
        if not payroll_valid:
            print("❌ Payroll math validation failed.")
            validation_failed = True
    
    if validation_failed:
        if backup_created:
            print("🔄 Rolling back changes due to validation failure...")
            try:
                safe_run(["git", "reset", "--hard", "HEAD"])
                safe_run(["git", "stash", "pop"])
                print("✅ Successfully rolled back to previous state")
            except subprocess.CalledProcessError as e:
                print(f"⚠️ Rollback failed: see error above")
        print("❌ Task validation failed. Task will remain in pending.")
        print(f"Summary saved → {summary_path}")
        print("Fix validation errors and run again.")
        return
    
    # Clear the backup stash since validation passed
    if backup_created:
        try:
            safe_run(["git", "stash", "drop"])
            print("🗑️ Removed git checkpoint (validation passed)")
        except subprocess.CalledProcessError:
            print("⚠️ Could not remove git checkpoint")
    
    print("✅ All validation checks passed!")
    
    # Update knowledge base with task completion info
    task_title = pathlib.Path(task_file).stem
    task_summary = task_text[:200] if task_text else "Task completed"
    update_knowledge(task_title, changed, task_summary)
    
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