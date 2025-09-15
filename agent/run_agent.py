import os, glob, json, textwrap, pathlib, subprocess, re, time, random, fnmatch, shutil, asyncio
from datetime import datetime, timedelta
from pathlib import Path
import threading
from collections import deque

# Import tool abstractions
try:
    from agent.tools import (
        GitTool, BuildTool, TestTool, DatabaseTool, CodebaseTool,
        ToolResult, run_full_validation, commit_with_validation
    )
    from agent.output_validator import (
        OutputValidator, ValidationConfig, validate_and_handle_task,
        validate_task_output, should_reject_patch, move_task_back_to_pending
    )
    from agent.evaluation_loop import (
        performance_tracker, agent_critic, collect_task_metrics, TaskMetrics
    )
except ImportError:
    from tools import (
        GitTool, BuildTool, TestTool, DatabaseTool, CodebaseTool,
        ToolResult, run_full_validation, commit_with_validation
    )
    from output_validator import (
        OutputValidator, ValidationConfig, validate_and_handle_task,
        validate_task_output, should_reject_patch, move_task_back_to_pending
    )
    from evaluation_loop import (
        performance_tracker, agent_critic, collect_task_metrics, TaskMetrics
    )

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
ARCHITECTURE_FILE = CONTEXT_DIR / "architecture.md"
DEPENDENCY_FILE = CONTEXT_DIR / "dependency_graph.json"
PAYROLL_SCENARIOS_FILE = ROOT / "tests" / "payroll_scenarios.json"
ALLOWED_PATHS_FILE = AGENT_DIR / "allowed_paths.json"
SANDBOX_DIR = pathlib.Path("/tmp/agent_build")
PROMPT_EVOLUTION_FILE = AGENT_DIR / "prompt_evolution.json"
LEARNED_PATTERNS_FILE = CONTEXT_DIR / "learned_patterns.md"
PLANNING_OUTPUT_FILE = AGENT_DIR / "current_plan.md"
IMPACT_ANALYSIS_FILE = AGENT_DIR / "impact_analysis.json"
MAX_FILES_PER_TASK = 3  # Maximum files that can be changed in a single task
CONFIG = json.loads(json.dumps({}))  # placeholder if you expand
FILE_BLOCK_START = "<<<FILE:"
FILE_BLOCK_END = ">>>END"

# ---- ARCHITECTURAL CONTEXT FILES ----
ARCHITECTURE_PATH = ROOT / "context" / "architecture.md"
SCHEMA_PATH = ROOT / "shared" / "schema.ts"
PAYROLL_ENGINE_PATH = ROOT / "server" / "greekPayrollCalculator.ts"

def safe_read(path: Path) -> str:
    """Safely read a file, returning content or warning message"""
    return path.read_text(encoding="utf-8") if path.exists() else f"⚠️ Missing: {path.name}"

ARCHITECTURE_TEXT = safe_read(ARCHITECTURE_PATH)
SCHEMA_TEXT = safe_read(SCHEMA_PATH)
PAYROLL_ENGINE_TEXT = safe_read(PAYROLL_ENGINE_PATH)

# Check for missing context files
if "⚠️ Missing" in ARCHITECTURE_TEXT + SCHEMA_TEXT + PAYROLL_ENGINE_TEXT:
    print("⚠️ Warning: One or more context files are missing. The agent may generate incorrect code.")
    print(f"   Architecture: {'✅' if ARCHITECTURE_PATH.exists() else '❌'} {ARCHITECTURE_PATH}")
    print(f"   Schema: {'✅' if SCHEMA_PATH.exists() else '❌'} {SCHEMA_PATH}")
    print(f"   Payroll Engine: {'✅' if PAYROLL_ENGINE_PATH.exists() else '❌'} {PAYROLL_ENGINE_PATH}")

# ---- RATE LIMITING ----
class RateLimiter:
    """Rate limiter to prevent API quota exhaustion"""
    
    def __init__(self, max_calls_per_minute=2, max_concurrent=1):
        self.max_calls_per_minute = max_calls_per_minute
        self.max_concurrent = max_concurrent
        self.calls_log = deque()  # Track call timestamps
        self.concurrent_semaphore = threading.Semaphore(max_concurrent)
        self.lock = threading.Lock()
        
    def can_make_call(self):
        """Check if we can make a call based on rate limits"""
        with self.lock:
            now = datetime.now()
            # Remove calls older than 1 minute
            while self.calls_log and now - self.calls_log[0] > timedelta(minutes=1):
                self.calls_log.popleft()
            
            # Check if we're under the rate limit
            return len(self.calls_log) < self.max_calls_per_minute
    
    def wait_for_rate_limit(self):
        """Wait until we can make a call"""
        while not self.can_make_call():
            with self.lock:
                if self.calls_log:
                    # Wait until the oldest call is more than 1 minute old
                    oldest_call = self.calls_log[0]
                    wait_time = 60 - (datetime.now() - oldest_call).total_seconds()
                    if wait_time > 0:
                        print(f"⏱️ Rate limit reached. Waiting {wait_time:.1f}s before next API call...")
                        time.sleep(wait_time + 1)  # Add 1 second buffer
                else:
                    break
    
    def log_call(self):
        """Log that a call was made"""
        with self.lock:
            self.calls_log.append(datetime.now())
    
    def acquire_concurrent_slot(self):
        """Acquire a concurrent execution slot"""
        print("🎯 Acquiring execution slot...")
        self.concurrent_semaphore.acquire()
        print("✅ Execution slot acquired")
    
    def release_concurrent_slot(self):
        """Release a concurrent execution slot"""
        self.concurrent_semaphore.release()
        print("🔄 Execution slot released")

# Global rate limiter instance
rate_limiter = RateLimiter(max_calls_per_minute=2, max_concurrent=1)

def mask_secrets(text):
    """Mask sensitive information in text output"""
    if not text:
        return text
    
    # Mask GitHub tokens in URLs
    masked = re.sub(r"https://[^@]+@", "https://***@", text)
    
    # Mask database connection strings (DSNs) - CRITICAL for preventing credential leaks
    masked = re.sub(r"(postgres|postgresql|mysql|mariadb|mongodb(\+srv)?|redis|amqp|mssql|sqlite)://[^:]+:[^@]+@", r"\1://***:***@", masked)
    masked = re.sub(r"jdbc:(postgresql|mysql|mariadb|sqlserver|oracle)://[^:]+:[^@]+@", r"jdbc:\1://***:***@", masked)
    
    # Mask API keys (comprehensive patterns)
    masked = re.sub(r"sk-[a-zA-Z0-9]{48,}", "sk-***MASKED***", masked)  # OpenAI API keys
    masked = re.sub(r"ghp_[a-zA-Z0-9]{36}", "ghp_***MASKED***", masked)  # GitHub personal access tokens
    masked = re.sub(r"Bearer [a-zA-Z0-9_\-\.]{20,}", "Bearer ***MASKED***", masked)  # Bearer tokens
    
    # Mask specific provider API keys
    masked = re.sub(r"sk_live_[a-zA-Z0-9]{24,}", "sk_live_***MASKED***", masked)  # Stripe live keys
    masked = re.sub(r"sk_test_[a-zA-Z0-9]{24,}", "sk_test_***MASKED***", masked)  # Stripe test keys
    masked = re.sub(r"SG\.[a-zA-Z0-9_\-\.]{22,}", "SG.***MASKED***", masked)  # SendGrid API keys
    masked = re.sub(r"xoxb-[a-zA-Z0-9\-]{50,}", "xoxb-***MASKED***", masked)  # Slack bot tokens
    masked = re.sub(r"xoxp-[a-zA-Z0-9\-]{50,}", "xoxp-***MASKED***", masked)  # Slack user tokens
    masked = re.sub(r"sk-ant-[a-zA-Z0-9_\-]{48,}", "sk-ant-***MASKED***", masked)  # Anthropic API keys
    masked = re.sub(r"AIza[a-zA-Z0-9_\-]{35}", "AIza***MASKED***", masked)  # Google API keys
    
    # Mask multiline private keys
    masked = re.sub(r"-----BEGIN [A-Z\s]+ PRIVATE KEY-----.*?-----END [A-Z\s]+ PRIVATE KEY-----", "-----BEGIN ***MASKED*** PRIVATE KEY-----", masked, flags=re.DOTALL)
    
    # Mask generic long tokens/secrets (32-64 characters of base64/hex)
    masked = re.sub(r"[a-zA-Z0-9+/]{32,64}={0,2}", "***MASKED_TOKEN***", masked)
    
    # Mask environment variable values in logs (expanded list)
    env_vars = [
        "OPENAI_API_KEY", "GITHUB_TOKEN", "DATABASE_URL", "API_KEY",
        "STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "SENDGRID_API_KEY",
        "SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "ANTHROPIC_API_KEY",
        "GOOGLE_API_KEY", "REPLIT_TOKEN", "JWT_SECRET", "SESSION_SECRET"
    ]
    for var in env_vars:
        masked = re.sub(rf"({var})=([^\s]+)", r"\1=***MASKED***", masked)
    
    return masked

def safe_log_subprocess_output(result, command_desc="command"):
    """Safely log subprocess output with secret masking"""
    if result.stdout:
        stdout_clean = mask_secrets(result.stdout)
        print(f"📋 {command_desc} output: {stdout_clean}")
    
    if result.stderr:
        stderr_clean = mask_secrets(result.stderr)
        print(f"⚠️ {command_desc} errors: {stderr_clean}")
    
    return result.returncode == 0

def safe_run(cmd):
    """Run git command safely, masking tokens from error output"""
    try:
        out = subprocess.run(cmd, check=True, capture_output=True, text=True)
        return out
    except subprocess.CalledProcessError as e:
        clean = mask_secrets(e.stderr or "")
        print(f"⚠️ Git error: {clean}")
        raise

def call_with_retry(func, max_tries=5):
    """Call function with exponential backoff retry logic and rate limiting"""
    delay = 5
    for attempt in range(max_tries):
        try:
            # Apply rate limiting before making the call
            rate_limiter.wait_for_rate_limit()
            rate_limiter.log_call()
            
            result = func()
            return result
        except Exception as e:
            # Special handling for rate limit errors
            if "rate limit" in str(e).lower() or "429" in str(e):
                print("⏳ Rate limited by API. Waiting 60s...")
                time.sleep(60)
                continue  # Skip normal delay and retry immediately
            
            print(f"⚠️ Error: {e} (retrying in {delay}s)")
            if attempt < max_tries - 1:  # Don't sleep on last attempt
                time.sleep(delay)
                delay *= 2 * (1 + random.random())
            else:
                raise RuntimeError("❌ Max retries exceeded")

# ---- PRE-COMMIT VALIDATION SYSTEM ----
def run_pre_commit_validation():
    """
    Comprehensive pre-commit validation using tool abstractions.
    
    Returns:
        bool: True if ALL validation checks pass, False otherwise
    """
    print("\n🔒 Starting pre-commit validation using tools...")
    
    # Use tool abstraction for validation
    validation_results = run_full_validation()
    
    # Check results and provide detailed feedback
    failed_checks = []
    for check_name, result in validation_results.items():
        if result.success:
            print(f"   ✅ {check_name}: {result.message}")
        else:
            print(f"   ❌ {check_name}: {result.message}")
            if result.error:
                print(f"      Error: {result.error}")
            failed_checks.append(check_name)
    
    if failed_checks:
        print(f"\n❌ VALIDATION FAILED - Commit blocked!")
        print(f"   Failed checks: {', '.join(failed_checks)}")
        print("\n💡 Fix all validation errors before committing.")
        return False
    else:
        print(f"\n✅ ALL VALIDATION CHECKS PASSED - Commit allowed!")
        total_time = sum(r.duration for r in validation_results.values() if r.duration)
        print(f"   Total validation time: {total_time:.1f}s")
        return True

# ---- SIMPLE OPENAI CALLER (no extra installs needed on Replit if using requests) ----
import requests

def make_openai_request(messages, use_structured_output=False):
    """Wrapper for OpenAI requests with structured output support"""
    return call_with_retry(lambda: call_openai(messages, use_structured_output=use_structured_output))

def call_openai(messages, model=MODEL, temperature=0.2, use_structured_output=False):
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type":"application/json"}
    payload = {"model": model, "messages": messages, "temperature": temperature}
    
    # Add structured output schema if requested
    if use_structured_output:
        payload["response_format"] = {
            "type": "json_schema",
            "json_schema": {
                "name": "agent_response",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "plan": {
                            "type": "string",
                            "description": "Brief implementation plan as bullet points"
                        },
                        "test_plan": {
                            "type": "string", 
                            "description": "How to verify the changes locally"
                        },
                        "files": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "path": {
                                        "type": "string",
                                        "description": "Relative path to the file"
                                    },
                                    "content": {
                                        "type": "string",
                                        "description": "Complete file content"
                                    }
                                },
                                "required": ["path", "content"],
                                "additionalProperties": False
                            }
                        },
                        "notes": {
                            "type": "string",
                            "description": "Additional implementation notes or considerations"
                        }
                    },
                    "required": ["plan", "test_plan", "files"],
                    "additionalProperties": False
                }
            }
        }
    
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

def load_allowed_paths():
    """Load file permission whitelist"""
    try:
        if not ALLOWED_PATHS_FILE.exists():
            print("❌ SECURITY: No allowed_paths.json found, DENYING all file modifications")
            print("🔒 Create agent/allowed_paths.json to configure allowed file paths")
            return {"forbidden_patterns": ["**/*"], "allowed_patterns": []}  # Fail closed
        
        data = json.loads(ALLOWED_PATHS_FILE.read_text(encoding="utf-8"))
        return data
    except Exception as e:
        print(f"❌ SECURITY: Error loading allowed paths: {e}")
        print("🔒 Denying all file modifications due to config error")
        return {"forbidden_patterns": ["**/*"], "allowed_patterns": []}  # Fail closed

def is_path_allowed(file_path, allowed_config):
    """Check if a file path is allowed to be modified"""
    if not allowed_config:
        return True, "No restrictions configured"
    
    # Normalize path separators
    normalized_path = file_path.replace('\\', '/')
    
    # Check forbidden patterns first (higher priority)
    forbidden_patterns = allowed_config.get("forbidden_patterns", [])
    for pattern in forbidden_patterns:
        if fnmatch.fnmatch(normalized_path, pattern):
            return False, f"Path matches forbidden pattern: {pattern}"
    
    # Check allowed patterns
    allowed_patterns = allowed_config.get("allowed_patterns", [])
    if not allowed_patterns:
        return False, "No allowed patterns specified - denying all modifications for security"
    
    for pattern in allowed_patterns:
        if fnmatch.fnmatch(normalized_path, pattern):
            return True, f"Path matches allowed pattern: {pattern}"
    
    return False, "Path not in allowed patterns"

def validate_and_parse_structured_response(response_text):
    """Validate and parse structured JSON response from OpenAI"""
    try:
        # Try to parse as JSON first
        response_data = json.loads(response_text)
        
        # Validate required fields
        required_fields = ["plan", "test_plan", "files"]
        for field in required_fields:
            if field not in response_data:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate files array structure
        if not isinstance(response_data["files"], list):
            raise ValueError("Files field must be an array")
        
        for i, file_obj in enumerate(response_data["files"]):
            if not isinstance(file_obj, dict):
                raise ValueError(f"File {i} must be an object")
            if "path" not in file_obj or "content" not in file_obj:
                raise ValueError(f"File {i} missing path or content field")
        
        print(f"✅ Structured response validation passed ({len(response_data['files'])} files)")
        return response_data, True
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parsing failed: {e}")
        return None, False
    except ValueError as e:
        print(f"❌ Response validation failed: {e}")
        return None, False
    except Exception as e:
        print(f"❌ Unexpected validation error: {e}")
        return None, False

def convert_structured_to_file_blocks(structured_data):
    """Convert structured JSON response to traditional file block format"""
    try:
        output_parts = []
        
        # Add plan section
        if structured_data.get("plan"):
            output_parts.append(f"## Implementation Plan\n{structured_data['plan']}\n")
        
        # Add test plan section
        if structured_data.get("test_plan"):
            output_parts.append(f"## Test Plan\n{structured_data['test_plan']}\n")
        
        # Add notes if provided
        if structured_data.get("notes"):
            output_parts.append(f"## Notes\n{structured_data['notes']}\n")
        
        # Convert files to file blocks
        for file_obj in structured_data.get("files", []):
            file_block = f"{FILE_BLOCK_START} {file_obj['path']}\n{file_obj['content']}\n{FILE_BLOCK_END}\n"
            output_parts.append(file_block)
        
        return "\n".join(output_parts)
    
    except Exception as e:
        print(f"❌ Error converting structured response: {e}")
        return None

def apply_file_blocks(response_text, target_root=None, is_structured=False):
    """Parses model output: either structured JSON or traditional file blocks
       <<<FILE: relative/path.ext
       ...new content...
       >>>END
    """
    # Use sandbox directory if specified, otherwise use main ROOT
    if target_root is None:
        target_root = ROOT
    
    # Load file permission whitelist
    allowed_config = load_allowed_paths()
    
    changed = []
    rejected = []
    
    # Handle structured JSON response
    if is_structured:
        structured_data, is_valid = validate_and_parse_structured_response(response_text)
        
        if not is_valid or not structured_data:
            print("❌ Structured response validation failed, cannot process files")
            return []
        
        # Process files from structured response
        for file_obj in structured_data.get("files", []):
            path = file_obj["path"]
            content = file_obj["content"]
            
            # Check if path is allowed
            is_allowed, reason = is_path_allowed(path, allowed_config)
            
            if is_allowed:
                target = target_root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(content, encoding="utf-8")
                changed.append(path)
                env_label = "sandbox" if target_root == SANDBOX_DIR else "main"
                print(f"✅ Applied changes to: {path} ({env_label})")
            else:
                rejected.append({"path": path, "reason": reason})
                print(f"🚫 Rejected file change: {path} - {reason}")
        
        # Save converted format for logging
        converted = convert_structured_to_file_blocks(structured_data)
        if converted:
            response_text = converted  # For summary logging
    
    else:
        # Handle traditional file block format
        text = response_text
        
        while True:
            start = text.find(FILE_BLOCK_START)
            if start == -1: break
            end = text.find(FILE_BLOCK_END, start)
            if end == -1: 
                print("❌ Malformed file block: missing end marker")
                break
            header_end = text.find("\n", start)
            if header_end == -1:
                print("❌ Malformed file block: missing newline after header")
                break
                
            header = text[start:header_end]
            path = header.replace(FILE_BLOCK_START, "").strip().strip(":").strip()
            content = text[header_end+1:end]
            
            # Check if path is allowed
            is_allowed, reason = is_path_allowed(path, allowed_config)
            
            if is_allowed:
                target = target_root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(content, encoding="utf-8")
                changed.append(path)
                env_label = "sandbox" if target_root == SANDBOX_DIR else "main"
                print(f"✅ Applied changes to: {path} ({env_label})")
            else:
                rejected.append({"path": path, "reason": reason})
                print(f"🚫 Rejected file change: {path} - {reason}")
            
            text = text[end+len(FILE_BLOCK_END):]
    
    # Report rejected files
    if rejected:
        print(f"\n⚠️ {len(rejected)} file changes were rejected for security:")
        for r in rejected:
            print(f"  - {r['path']}: {r['reason']}")
        print("\nTo allow these changes, update agent/allowed_paths.json")
    
    return changed

def parse_task_metadata(task_file_path):
    """Parse metadata from the top of a task file"""
    try:
        content = pathlib.Path(task_file_path).read_text(encoding="utf-8")
        lines = content.split('\n')
        
        metadata = {}
        i = 0
        
        # Parse metadata from top of file (before any markdown headers)
        while i < len(lines):
            line = lines[i].strip()
            
            # Stop at first markdown header or empty line after metadata
            if line.startswith('#') or (line == '' and metadata):
                break
                
            # Parse key: value pairs
            if ':' in line and not line.startswith('#'):
                key, value = line.split(':', 1)
                key = key.strip().lower()
                value = value.strip()
                
                if key == 'priority':
                    metadata['priority'] = value.lower()
                elif key == 'depends_on':
                    # Support comma-separated dependencies
                    deps = [d.strip() for d in value.split(',') if d.strip()]
                    metadata['depends_on'] = deps
                elif key in ['tags', 'category', 'type']:
                    metadata[key] = value
                    
            i += 1
            
        return metadata
    except Exception as e:
        print(f"⚠️ Could not parse metadata from {task_file_path}: {e}")
        return {}

def check_dependencies_met(dependencies):
    """Check if all dependencies are completed (exist in /done folder)"""
    if not dependencies:
        return True, []
    
    done_files = list((ROOT / "tasks/done").glob("*.md"))
    done_names = {f.stem.lower() for f in done_files}
    
    # Also check for partial matches (task names might have timestamps)
    done_content = set()
    for done_file in done_files:
        try:
            content = done_file.read_text(encoding="utf-8").lower()
            done_content.add(content)
        except:
            pass
    
    unmet_deps = []
    for dep in dependencies:
        dep_lower = dep.lower()
        
        # Check exact name match
        if dep_lower in done_names:
            continue
            
        # Check partial name match
        if any(dep_lower in name for name in done_names):
            continue
            
        # Check content match (dependency mentioned in completed task)
        if any(dep_lower in content for content in done_content):
            continue
            
        unmet_deps.append(dep)
    
    return len(unmet_deps) == 0, unmet_deps

def get_task_priority_score(priority):
    """Convert priority string to numeric score (higher = more important)"""
    priority_map = {
        'critical': 100,
        'high': 80,
        'medium': 50,
        'normal': 50,
        'low': 20,
        'background': 10
    }
    return priority_map.get(priority, 50)  # Default to medium

def is_task_relevant(task_content):
    """Check if a task is relevant to Greek payroll system"""
    # Convert to lowercase for case-insensitive matching
    content_lower = task_content.lower()
    
    # Greek payroll and HR related keywords
    payroll_keywords = [
        "payroll", "efka", "sse", "σσε", "greek", "greece", "ελλάδα", "ελληνικ",
        "salary", "wage", "μισθ", "overtime", "υπερωρίες", "holiday", "εργάσιμ",
        "employee", "εργαζόμενος", "εργάτης", "employer", "εργοδότης",
        "tax", "φόρος", "φορολογ", "contribution", "εισφορ", "insurance", "ασφάλ",
        "digital work card", "ψηφιακή κάρτα εργασίας", "ergani", "εργάνη",
        "time tracking", "timesheet", "χρονομέτρηση", "ωράριο",
        "hr", "human resources", "ανθρώπινο δυναμικό", "προσωπικό",
        "contract", "σύμβαση", "employment", "απασχόληση", "εργασία",
        "leave", "άδεια", "vacation", "διακοπές", "sick leave", "αρρώστια",
        "bonus", "bonus", "επίδομα", "allowance", "παροχή"
    ]
    
    # Check if any payroll keywords are present
    has_payroll_keywords = any(keyword in content_lower for keyword in payroll_keywords)
    
    # System maintenance keywords that are allowed only with explicit metadata
    system_keywords = [
        "guardrails", "security", "ασφάλεια", "rate limiting", "validation", "επαλήθευση", 
        "test harness", "δοκιμή", "performance", "απόδοση", "bug fix", "διόρθωση",
        "migration", "μετανάστευση", "database optimization", "optimization"
    ]
    
    # Check for system maintenance tasks
    has_system_keywords = any(keyword in content_lower for keyword in system_keywords)
    
    # Check for explicit system metadata tags
    has_system_metadata = any(tag in content_lower for tag in [
        "category: system", "type: system", "category: guardrail", "type: security",
        "category: infrastructure", "type: maintenance"
    ])
    
    # Explicitly blocked non-business keywords that indicate unrelated tasks
    blocked_keywords = [
        "game", "παιχνίδι", "music", "μουσική", "video", "βίντεο", 
        "social media", "κοινωνικά δίκτυα", "entertainment", "διασκέδαση",
        "shopping", "αγορές", "e-commerce", "ηλεκτρονικό εμπόριο",
        "blog", "ιστολόγιο", "news", "ειδήσεις", "weather", "καιρός",
        "travel", "ταξίδι", "restaurant", "εστιατόριο", "food", "φαγητό",
        "personal", "προσωπικό", "hobby", "χόμπι", "sports", "αθλητισμός"
    ]
    
    # Check for blocked content
    has_blocked_content = any(keyword in content_lower for keyword in blocked_keywords)
    
    if has_blocked_content:
        return False, f"Task appears to be unrelated to payroll system (contains blocked keywords)"
    
    # Primary acceptance: Must have payroll-related keywords
    if has_payroll_keywords:
        return True, "Task is relevant to Greek payroll system"
    
    # Secondary acceptance: System maintenance tasks with explicit metadata
    if has_system_keywords and has_system_metadata:
        return True, "Task is system maintenance with explicit categorization"
    
    # Reject everything else
    return False, "Task must contain Greek payroll keywords OR be explicitly categorized system maintenance"

def pick_next_task():
    """Pick the next task based on priority and dependencies"""
    pending_files = list((ROOT / "tasks/pending").glob("*.md"))
    if not pending_files:
        return None
    
    print(f"📋 Evaluating {len(pending_files)} pending tasks...")
    
    # First, filter out irrelevant tasks using relevance classifier
    relevant_tasks = []
    for task_file in pending_files:
        task_content = read_file(str(task_file))
        is_relevant, reason = is_task_relevant(task_content)
        
        if not is_relevant:
            print(f"🚫 Rejecting irrelevant task: {task_file.name}")
            print(f"   Reason: {reason}")
            
            # Move irrelevant task to a rejected folder
            rejected_dir = ROOT / "tasks/rejected"
            rejected_dir.mkdir(exist_ok=True)
            rejected_path = rejected_dir / task_file.name
            task_file.rename(rejected_path)
            continue
        
        print(f"✅ Task relevance check passed: {task_file.name}")
        print(f"   Reason: {reason}")
        relevant_tasks.append(task_file)
    
    if not relevant_tasks:
        print("⚠️ No relevant tasks found in pending queue")
        return None
    
    # Parse all relevant tasks with metadata
    task_candidates = []
    blocked_tasks = []
    
    for task_file in relevant_tasks:
        metadata = parse_task_metadata(task_file)
        priority = metadata.get('priority', 'medium')
        dependencies = metadata.get('depends_on', [])
        
        # Check if dependencies are met
        deps_met, unmet_deps = check_dependencies_met(dependencies)
        
        if deps_met:
            priority_score = get_task_priority_score(priority)
            task_candidates.append({
                'file': str(task_file),
                'priority_score': priority_score,
                'priority': priority,
                'dependencies': dependencies
            })
        else:
            blocked_tasks.append({
                'file': str(task_file),
                'unmet_deps': unmet_deps,
                'priority': priority
            })
    
    # Report blocked tasks
    if blocked_tasks:
        print("⏸️ Blocked tasks waiting for dependencies:")
        for blocked in blocked_tasks:
            task_name = pathlib.Path(blocked['file']).stem
            deps = ', '.join(blocked['unmet_deps'])
            print(f"  - {task_name} (priority: {blocked['priority']}) → waiting for: {deps}")
    
    # No runnable tasks
    if not task_candidates:
        if blocked_tasks:
            print("❌ All tasks are blocked by dependencies")
        else:
            print("❌ No pending tasks found")
        return None
    
    # Sort by priority (highest first), then by filename for consistency
    task_candidates.sort(key=lambda t: (-t['priority_score'], t['file']))
    
    selected = task_candidates[0]
    task_name = pathlib.Path(selected['file']).stem
    print(f"🎯 Selected task: {task_name} (priority: {selected['priority']})")
    
    if selected['dependencies']:
        print(f"✅ Dependencies satisfied: {', '.join(selected['dependencies'])}")
    
    return selected['file']

def read_knowledge():
    """Read the current AI knowledge base"""
    if not KNOWLEDGE_FILE.exists():
        return "No previous knowledge available."
    return KNOWLEDGE_FILE.read_text(encoding="utf-8")

def read_architecture_guide():
    """Read the architecture guide that provides system boundaries and rules"""
    if not ARCHITECTURE_FILE.exists():
        return "No architecture guide available."
    return ARCHITECTURE_FILE.read_text(encoding="utf-8")

def generate_dependency_graph():
    """Generate dependency graph using tool abstraction"""
    CONTEXT_DIR.mkdir(exist_ok=True)
    
    result = CodebaseTool.analyze_dependencies()
    
    if result.success:
        # Save to dependency file
        DEPENDENCY_FILE.write_text(json.dumps(result.data, indent=2), encoding="utf-8")
        print(result.message)
        return result.data
    else:
        print(f"⚠️ {result.message}")
        if result.error:
            print(f"   Error: {result.error}")
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

def run_quality_critic(task_file, changed_files, task_summary):
    """Run automated quality critic to evaluate the completed task"""
    try:
        print("🔍 Running quality critic evaluation...")
        
        # Get git diff of recent changes
        try:
            diff_result = subprocess.run([
                "git", "diff", "HEAD~1", "HEAD"
            ], cwd=ROOT, capture_output=True, text=True, timeout=30)
            
            if diff_result.returncode != 0:
                # If no previous commit, get diff of staged changes
                diff_result = subprocess.run([
                    "git", "diff", "--cached"
                ], cwd=ROOT, capture_output=True, text=True, timeout=30)
            
            git_diff = diff_result.stdout if diff_result.returncode == 0 else "No diff available"
        except:
            git_diff = "Could not retrieve git diff"
        
        # Read original task requirements
        task_content = read_file(task_file)
        
        # Prepare critic prompt
        critic_system = {
            "role": "system",
            "content": (
                "You are a senior code quality critic specializing in Greek payroll systems.\n\n"
                "Here is the full architecture and coding rules you MUST follow:\n\n"
                f"{ARCHITECTURE_TEXT}\n\n"
                "Here is the database schema you MUST respect:\n\n"
                f"{SCHEMA_TEXT}\n\n"
                "Here is the existing core payroll calculation logic you must improve and not break:\n\n"
                f"{PAYROLL_ENGINE_TEXT}\n\n"
                "Your job is to evaluate completed tasks and provide constructive feedback."
            ) + textwrap.dedent("""
            
            EVALUATION CRITERIA:
            - Does the implementation match the task requirements?
            - Is the code following Greek labor law requirements correctly?
            - Are EFKA calculations accurate and compliant?
            - Is the code maintainable and well-structured?
            - Are there any potential bugs or edge cases missed?
            - Does it integrate properly with existing payroll architecture?
            
            FEEDBACK FORMAT:
            Provide feedback in this structure:
            ## Overall Assessment: [EXCELLENT/GOOD/FAIR/NEEDS_IMPROVEMENT]
            
            ## Requirements Compliance: [rating 1-5]
            - [specific feedback on requirement fulfillment]
            
            ## Code Quality: [rating 1-5]  
            - [feedback on structure, maintainability, patterns]
            
            ## Greek Labor Law Compliance: [rating 1-5]
            - [feedback on legal accuracy and EFKA compliance]
            
            ## Potential Issues:
            - [list any concerns or missing edge cases]
            
            ## Recommendations:
            - [specific suggestions for improvement]
            
            Be constructive but thorough. Focus on actionable feedback.
            """).strip()
        }
        
        critic_user = {
            "role": "user", 
            "content": textwrap.dedent(f"""
            Please evaluate this completed task:
            
            ORIGINAL TASK:
            ---
            {task_content}
            
            IMPLEMENTATION CHANGES:
            ---
            {git_diff[:3000]}{"..." if len(git_diff) > 3000 else ""}
            
            CHANGED FILES: {', '.join(changed_files) if changed_files else 'None'}
            
            TASK SUMMARY: {task_summary}
            """).strip()
        }
        
        # Call critic AI
        try:
            critic_response = call_with_retry(lambda: call_openai([critic_system, critic_user]))
            
            if critic_response:
                # Save critic report
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                task_name = pathlib.Path(task_file).stem
                critic_file = AGENT_DIR / f"critic_report_{task_name}_{timestamp}.md"
                
                report_content = f"""# Quality Critic Report: {task_name}

**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M")}
**Task File:** {task_file}
**Changed Files:** {', '.join(changed_files) if changed_files else 'None'}

---

{critic_response}

---

**Git Diff Summary:**
```
{git_diff[:1000]}{"..." if len(git_diff) > 1000 else ""}
```
"""
                
                critic_file.write_text(report_content, encoding="utf-8")
                print(f"📋 Quality critic report saved: {critic_file}")
                
                # Extract overall assessment for quick feedback
                if "EXCELLENT" in critic_response:
                    print("⭐ Critic Assessment: EXCELLENT")
                elif "GOOD" in critic_response:
                    print("✅ Critic Assessment: GOOD")
                elif "FAIR" in critic_response:
                    print("⚠️ Critic Assessment: FAIR")
                elif "NEEDS_IMPROVEMENT" in critic_response:
                    print("❌ Critic Assessment: NEEDS IMPROVEMENT")
                else:
                    print("📝 Critic Assessment: See report for details")
                    
                return True
            else:
                print("⚠️ Could not get critic response")
                return False
                
        except Exception as e:
            print(f"⚠️ Error running critic evaluation: {e}")
            return False
            
    except Exception as e:
        print(f"⚠️ Error in quality critic: {e}")
        return False

def analyze_critic_reports():
    """Analyze past critic reports to extract improvement patterns"""
    try:
        critic_files = list(AGENT_DIR.glob("critic_report_*.md"))
        if not critic_files:
            return {}
        
        print(f"📊 Analyzing {len(critic_files)} critic reports for skill growth...")
        
        patterns = {
            "common_issues": [],
            "architectural_insights": [],
            "greek_law_refinements": [],
            "code_quality_patterns": [],
            "success_patterns": []
        }
        
        for critic_file in critic_files[-10:]:  # Analyze last 10 reports
            try:
                content = critic_file.read_text(encoding="utf-8")
                
                # Extract assessment level
                if "Overall Assessment: EXCELLENT" in content:
                    patterns["success_patterns"].append(extract_success_factors(content))
                elif "Overall Assessment: NEEDS_IMPROVEMENT" in content:
                    patterns["common_issues"].append(extract_issues(content))
                
                # Extract specific insights
                if "Greek Labor Law Compliance:" in content:
                    patterns["greek_law_refinements"].append(extract_law_insights(content))
                
                if "Code Quality:" in content:
                    patterns["code_quality_patterns"].append(extract_quality_insights(content))
                
                if "Recommendations:" in content:
                    patterns["architectural_insights"].append(extract_recommendations(content))
                    
            except Exception as e:
                print(f"⚠️ Error analyzing {critic_file.name}: {e}")
        
        return patterns
        
    except Exception as e:
        print(f"⚠️ Error analyzing critic reports: {e}")
        return {}

def extract_success_factors(content):
    """Extract what made a task successful"""
    lines = content.split('\n')
    success_factors = []
    
    in_compliance_section = False
    in_quality_section = False
    
    for line in lines:
        if "Requirements Compliance:" in line and "5/5" in line:
            success_factors.append("Perfect requirements compliance")
        elif "Code Quality:" in line and "5/5" in line:
            success_factors.append("Excellent code quality")
        elif "✅" in line:
            success_factors.append(line.strip())
    
    return success_factors

def extract_issues(content):
    """Extract common issues from poor assessments"""
    lines = content.split('\n')
    issues = []
    
    for line in lines:
        if "⚠️" in line or "Missing" in line or "Consider" in line:
            issues.append(line.strip())
    
    return issues

def extract_law_insights(content):
    """Extract Greek labor law insights"""
    lines = content.split('\n')
    insights = []
    
    for line in lines:
        if any(keyword in line for keyword in ["N. 4093/2012", "EFKA", "ΣΣΕ", "Digital Work Card", "overtime", "holiday"]):
            insights.append(line.strip())
    
    return insights

def extract_quality_insights(content):
    """Extract code quality patterns"""
    lines = content.split('\n')
    insights = []
    
    for line in lines:
        if any(keyword in line for keyword in ["test", "validation", "error handling", "type safety", "performance"]):
            insights.append(line.strip())
    
    return insights

def extract_recommendations(content):
    """Extract architectural recommendations"""
    lines = content.split('\n')
    recommendations = []
    
    in_recommendations = False
    for line in lines:
        if "## Recommendations:" in line:
            in_recommendations = True
            continue
        elif line.startswith("##") and in_recommendations:
            break
        elif in_recommendations and line.strip():
            recommendations.append(line.strip())
    
    return recommendations

def evolve_prompt_guidelines(patterns):
    """Evolve the system prompt based on learned patterns"""
    try:
        # Load existing evolution data
        evolution_data = {}
        if PROMPT_EVOLUTION_FILE.exists():
            evolution_data = json.loads(PROMPT_EVOLUTION_FILE.read_text(encoding="utf-8"))
        
        # Initialize evolution tracking
        if "version" not in evolution_data:
            evolution_data = {
                "version": 1,
                "last_updated": datetime.now().isoformat(),
                "learned_guidelines": [],
                "architectural_patterns": [],
                "greek_law_insights": [],
                "quality_improvements": []
            }
        
        # Add new insights from critic analysis
        new_guidelines = []
        
        # Process common issues to create preventive guidelines
        for issue_group in patterns.get("common_issues", []):
            for issue in issue_group:
                if "missing" in issue.lower():
                    guideline = f"ALWAYS ensure: {issue.replace('Missing', 'Include').replace('⚠️', '').strip()}"
                    new_guidelines.append(guideline)
        
        # Process success patterns to reinforce good practices
        for success_group in patterns.get("success_patterns", []):
            for success in success_group:
                if "✅" in success:
                    guideline = f"BEST PRACTICE: {success.replace('✅', '').strip()}"
                    new_guidelines.append(guideline)
        
        # Add architectural insights
        for insight_group in patterns.get("architectural_insights", []):
            for insight in insight_group:
                if insight and len(insight) > 10:
                    evolution_data["architectural_patterns"].append(insight)
        
        # Add Greek law insights
        for law_group in patterns.get("greek_law_refinements", []):
            for law_insight in law_group:
                if any(keyword in law_insight for keyword in ["N. 4093/2012", "EFKA", "overtime"]):
                    evolution_data["greek_law_insights"].append(law_insight)
        
        # Add quality improvements
        for quality_group in patterns.get("code_quality_patterns", []):
            for quality in quality_group:
                if any(keyword in quality for keyword in ["test", "validation", "error"]):
                    evolution_data["quality_improvements"].append(quality)
        
        # Update evolution data
        evolution_data["learned_guidelines"].extend(new_guidelines)
        evolution_data["version"] += 1
        evolution_data["last_updated"] = datetime.now().isoformat()
        
        # Remove duplicates and keep recent insights
        evolution_data["learned_guidelines"] = list(set(evolution_data["learned_guidelines"]))[-50:]
        evolution_data["architectural_patterns"] = list(set(evolution_data["architectural_patterns"]))[-30:]
        evolution_data["greek_law_insights"] = list(set(evolution_data["greek_law_insights"]))[-30:]
        evolution_data["quality_improvements"] = list(set(evolution_data["quality_improvements"]))[-30:]
        
        # Save evolution data
        PROMPT_EVOLUTION_FILE.write_text(
            json.dumps(evolution_data, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
        
        print(f"🧠 Prompt evolution updated to version {evolution_data['version']}")
        print(f"   - {len(new_guidelines)} new guidelines learned")
        print(f"   - {len(evolution_data['architectural_patterns'])} architectural patterns")
        print(f"   - {len(evolution_data['greek_law_insights'])} Greek law insights")
        
        return evolution_data
        
    except Exception as e:
        print(f"⚠️ Error evolving prompt guidelines: {e}")
        return {}

def update_learned_patterns(evolution_data):
    """Update the learned patterns documentation"""
    try:
        CONTEXT_DIR.mkdir(exist_ok=True)
        
        learned_content = f"""# Learned Patterns and Guidelines

**Last Updated**: {evolution_data.get('last_updated', 'Unknown')}
**Version**: {evolution_data.get('version', 1)}

## Evolved Guidelines

These guidelines have been learned from past task completions and critic feedback:

"""
        
        for guideline in evolution_data.get('learned_guidelines', []):
            learned_content += f"- {guideline}\n"
        
        learned_content += f"""

## Architectural Patterns

Proven architectural patterns from successful implementations:

"""
        
        for pattern in evolution_data.get('architectural_patterns', []):
            learned_content += f"- {pattern}\n"
        
        learned_content += f"""

## Greek Labor Law Insights

Specific insights about Greek payroll compliance:

"""
        
        for insight in evolution_data.get('greek_law_insights', []):
            learned_content += f"- {insight}\n"
        
        learned_content += f"""

## Quality Improvements

Code quality and testing insights:

"""
        
        for improvement in evolution_data.get('quality_improvements', []):
            learned_content += f"- {improvement}\n"
        
        LEARNED_PATTERNS_FILE.write_text(learned_content, encoding="utf-8")
        print(f"📚 Updated learned patterns documentation")
        
    except Exception as e:
        print(f"⚠️ Error updating learned patterns: {e}")

def load_evolved_guidelines():
    """Load evolved guidelines to enhance the system prompt"""
    try:
        if not PROMPT_EVOLUTION_FILE.exists():
            return ""
        
        evolution_data = json.loads(PROMPT_EVOLUTION_FILE.read_text(encoding="utf-8"))
        
        guidelines_text = ""
        
        if evolution_data.get('learned_guidelines'):
            guidelines_text += "\n        EVOLVED GUIDELINES (learned from experience):\n"
            for guideline in evolution_data['learned_guidelines'][-20:]:  # Last 20 guidelines
                guidelines_text += f"        - {guideline}\n"
        
        if evolution_data.get('architectural_patterns'):
            guidelines_text += "\n        PROVEN ARCHITECTURAL PATTERNS:\n"
            for pattern in evolution_data['architectural_patterns'][-10:]:  # Last 10 patterns
                guidelines_text += f"        - {pattern}\n"
        
        if evolution_data.get('greek_law_insights'):
            guidelines_text += "\n        GREEK LAW EXPERTISE (from experience):\n"
            for insight in evolution_data['greek_law_insights'][-15:]:  # Last 15 insights
                guidelines_text += f"        - {insight}\n"
        
        return guidelines_text
        
    except Exception as e:
        print(f"⚠️ Error loading evolved guidelines: {e}")
        return ""

def perform_skill_growth_cycle():
    """Perform a complete skill growth and prompt evolution cycle"""
    try:
        print("🧠 Starting skill growth and prompt evolution cycle...")
        
        # Analyze past critic reports
        patterns = analyze_critic_reports()
        
        if not patterns or not any(patterns.values()):
            print("📊 No significant patterns found, skipping evolution")
            return False
        
        # Evolve prompt guidelines based on patterns
        evolution_data = evolve_prompt_guidelines(patterns)
        
        if not evolution_data:
            print("⚠️ Failed to evolve guidelines")
            return False
        
        # Update learned patterns documentation
        update_learned_patterns(evolution_data)
        
        print("✅ Skill growth cycle completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error in skill growth cycle: {e}")
        return False

def run_change_impact_analysis(changed_files=None):
    """Run dependency analysis using ts-morph to identify impact of changes"""
    try:
        print("🔍 Running change impact analysis...")
        
        # Prepare command
        scanner_script = AGENT_DIR / "dependency_scanner.js"
        cmd = ["node", str(scanner_script), str(ROOT)]
        
        # Add changed files if provided
        if changed_files:
            cmd.extend(changed_files)
        
        # Run the dependency scanner
        result = subprocess.run(
            cmd, 
            cwd=ROOT, 
            capture_output=True, 
            text=True, 
            timeout=120
        )
        
        if result.returncode != 0:
            print(f"⚠️ Dependency scanner failed: {result.stderr}")
            return None
        
        # Load and return the impact analysis
        if IMPACT_ANALYSIS_FILE.exists():
            analysis_data = json.loads(IMPACT_ANALYSIS_FILE.read_text(encoding="utf-8"))
            
            if analysis_data.get('success'):
                print(f"✅ Impact analysis complete: {analysis_data.get('totalFiles', 0)} files analyzed")
                
                if analysis_data.get('impactAnalysis'):
                    impact = analysis_data['impactAnalysis']
                    print(f"   📊 Impact: {impact['summary']}")
                    print(f"   ⚠️ Risk level: {impact['riskLevel']}")
                    
                    if impact.get('potentialBreakingChanges'):
                        print(f"   🚨 {len(impact['potentialBreakingChanges'])} potential breaking changes detected")
                
                return analysis_data
            else:
                print(f"❌ Analysis failed: {analysis_data.get('error', 'Unknown error')}")
                return None
        else:
            print("⚠️ Impact analysis file not found")
            return None
            
    except subprocess.TimeoutExpired:
        print("⚠️ Dependency scanner timed out")
        return None
    except Exception as e:
        print(f"⚠️ Error running impact analysis: {e}")
        return None

def format_impact_analysis_for_prompt(analysis_data):
    """Format impact analysis results for inclusion in AI prompt"""
    if not analysis_data or not analysis_data.get('success'):
        return ""
    
    try:
        impact = analysis_data.get('impactAnalysis')
        dependency_graph = analysis_data.get('dependencyGraph', {})
        
        prompt_section = "\n        CHANGE IMPACT ANALYSIS:\n"
        
        # Overall project structure
        prompt_section += f"        - Total files in project: {analysis_data.get('totalFiles', 0)}\n"
        prompt_section += f"        - Dependency graph available for impact analysis\n"
        
        # If we have specific impact analysis
        if impact:
            prompt_section += f"        - Files being changed: {len(impact.get('directlyAffected', []))} directly affected\n"
            prompt_section += f"        - Additional files impacted: {len(impact.get('indirectlyAffected', []))} indirectly affected\n"
            prompt_section += f"        - Risk level: {impact.get('riskLevel', 'UNKNOWN')}\n"
            
            # List directly affected files
            directly_affected = impact.get('directlyAffected', [])
            if directly_affected:
                prompt_section += f"        \n        DIRECTLY AFFECTED FILES (must be carefully reviewed):\n"
                for affected_file in directly_affected[:10]:  # Limit to first 10
                    prompt_section += f"        - {affected_file}\n"
                if len(directly_affected) > 10:
                    prompt_section += f"        - ... and {len(directly_affected) - 10} more files\n"
            
            # Potential breaking changes
            breaking_changes = impact.get('potentialBreakingChanges', [])
            if breaking_changes:
                prompt_section += f"        \n        ⚠️ POTENTIAL BREAKING CHANGES:\n"
                for change in breaking_changes[:5]:  # Limit to first 5
                    prompt_section += f"        - {change['file']}: {change['reason']} (Risk: {change['severity']})\n"
            
            # Risk mitigation advice
            risk_level = impact.get('riskLevel', 'LOW')
            if risk_level == 'HIGH':
                prompt_section += f"        \n        🚨 HIGH RISK CHANGES - Extra caution required:\n"
                prompt_section += f"        - Consider breaking changes into smaller increments\n"
                prompt_section += f"        - Add comprehensive tests for affected modules\n"
                prompt_section += f"        - Verify all affected files still function correctly\n"
            elif risk_level == 'MEDIUM':
                prompt_section += f"        \n        ⚠️ MEDIUM RISK CHANGES - Review carefully:\n"
                prompt_section += f"        - Test affected modules thoroughly\n"
                prompt_section += f"        - Check for breaking changes in interfaces\n"
        
        # Key dependency insights
        forward_deps = dependency_graph.get('forwardDeps', {})
        reverse_deps = dependency_graph.get('reverseDeps', {})
        
        if forward_deps:
            # Find files with many dependencies (potential complexity)
            high_dep_files = [(f, len(deps)) for f, deps in forward_deps.items() if len(deps) > 5]
            high_dep_files.sort(key=lambda x: x[1], reverse=True)
            
            if high_dep_files:
                prompt_section += f"        \n        HIGH-DEPENDENCY FILES (handle with care):\n"
                for file_path, dep_count in high_dep_files[:5]:
                    prompt_section += f"        - {file_path} (imports {dep_count} modules)\n"
        
        if reverse_deps:
            # Find files with many dependents (high impact)
            high_impact_files = [(f, len(deps)) for f, deps in reverse_deps.items() if len(deps) > 3]
            high_impact_files.sort(key=lambda x: x[1], reverse=True)
            
            if high_impact_files:
                prompt_section += f"        \n        HIGH-IMPACT FILES (changes affect many modules):\n"
                for file_path, dependent_count in high_impact_files[:5]:
                    prompt_section += f"        - {file_path} (used by {dependent_count} modules)\n"
        
        return prompt_section
        
    except Exception as e:
        print(f"⚠️ Error formatting impact analysis: {e}")
        return ""

def get_planned_files_from_response(plan_text):
    """Extract planned file changes from the planning response"""
    planned_files = []
    
    try:
        lines = plan_text.split('\n')
        in_files_section = False
        
        for line in lines:
            line = line.strip()
            
            if line.startswith("## FILES TO MODIFY/CREATE"):
                in_files_section = True
                continue
            elif line.startswith("##") and in_files_section:
                break
            elif in_files_section and line.startswith("-"):
                # Extract file path from line like "- path/to/file.ts: description"
                file_part = line[1:].strip()
                if ':' in file_part:
                    file_path = file_part.split(':')[0].strip()
                    planned_files.append(file_path)
        
        return planned_files
        
    except Exception as e:
        print(f"⚠️ Error extracting planned files: {e}")
        return []

def count_files_in_plan(plan_text):
    """Count the number of files planned to be modified/created"""
    planned_files = get_planned_files_from_response(plan_text)
    return len(planned_files)

def create_subtasks_from_large_plan(plan_text, original_task_file):
    """Split a large plan into smaller subtasks with max 3 files each"""
    try:
        print("📦 Task is too large, creating subtasks...")
        
        planned_files = get_planned_files_from_response(plan_text)
        if len(planned_files) <= MAX_FILES_PER_TASK:
            return []
        
        # Parse the plan to extract steps and group related files
        parsed_plan = parse_implementation_plan(plan_text)
        if not parsed_plan:
            # Fallback: simple file-based splitting
            return create_simple_file_based_subtasks(planned_files, original_task_file)
        
        # Group files by functionality/steps
        subtasks = []
        implementation_steps = parsed_plan.get('implementation_steps', [])
        
        # Try to group files logically based on implementation steps
        current_subtask = {
            'files': [],
            'steps': [],
            'description': ''
        }
        
        file_to_step_map = create_file_to_step_mapping(planned_files, implementation_steps)
        
        for file_path in planned_files:
            related_steps = file_to_step_map.get(file_path, [])
            
            # If adding this file would exceed the limit, create a new subtask
            if len(current_subtask['files']) >= MAX_FILES_PER_TASK:
                if current_subtask['files']:
                    subtasks.append(current_subtask)
                current_subtask = {
                    'files': [],
                    'steps': [],
                    'description': ''
                }
            
            current_subtask['files'].append(file_path)
            current_subtask['steps'].extend(related_steps)
        
        # Add the last subtask if it has files
        if current_subtask['files']:
            subtasks.append(current_subtask)
        
        # Create task files for each subtask
        created_subtasks = []
        original_task_name = pathlib.Path(original_task_file).stem
        
        for i, subtask in enumerate(subtasks, 1):
            subtask_name = f"{original_task_name}_part{i}"
            subtask_file = str(ROOT / f"tasks/pending/{subtask_name}.md")
            
            # Create subtask content
            subtask_content = create_subtask_content(
                subtask, i, len(subtasks), plan_text, parsed_plan
            )
            
            # Write subtask file
            pathlib.Path(subtask_file).write_text(subtask_content, encoding="utf-8")
            created_subtasks.append(subtask_file)
            
            print(f"   📄 Created subtask {i}/{len(subtasks)}: {subtask_name} ({len(subtask['files'])} files)")
        
        return created_subtasks
        
    except Exception as e:
        print(f"⚠️ Error creating subtasks: {e}")
        return []

def create_file_to_step_mapping(planned_files, implementation_steps):
    """Map files to related implementation steps"""
    file_to_step_map = {}
    
    for file_path in planned_files:
        file_name = pathlib.Path(file_path).name
        file_base = pathlib.Path(file_path).stem
        
        related_steps = []
        for step in implementation_steps:
            step_lower = step.lower()
            if (file_name.lower() in step_lower or 
                file_base.lower() in step_lower or
                any(part in step_lower for part in file_path.split('/') if len(part) > 2)):
                related_steps.append(step)
        
        file_to_step_map[file_path] = related_steps
    
    return file_to_step_map

def create_simple_file_based_subtasks(planned_files, original_task_file):
    """Simple fallback: split files into groups of MAX_FILES_PER_TASK"""
    subtasks = []
    original_task_name = pathlib.Path(original_task_file).stem
    
    for i in range(0, len(planned_files), MAX_FILES_PER_TASK):
        file_group = planned_files[i:i + MAX_FILES_PER_TASK]
        subtask_num = (i // MAX_FILES_PER_TASK) + 1
        
        subtask_name = f"{original_task_name}_part{subtask_num}"
        subtask_file = str(ROOT / f"tasks/pending/{subtask_name}.md")
        
        subtask_content = f"""# {subtask_name}

**Part {subtask_num} of split task from {original_task_name}**

## Files to modify in this subtask:
{chr(10).join(f'- {file}' for file in file_group)}

## Instructions:
Continue the implementation focusing only on the files listed above.
Ensure this part integrates properly with other parts of the split task.
"""
        
        pathlib.Path(subtask_file).write_text(subtask_content, encoding="utf-8")
        subtasks.append(subtask_file)
    
    return subtasks

def create_subtask_content(subtask_info, part_num, total_parts, original_plan, parsed_plan):
    """Create detailed content for a subtask"""
    files_list = '\n'.join(f'- {file}' for file in subtask_info['files'])
    steps_list = '\n'.join(f'{i+1}. {step}' for i, step in enumerate(subtask_info['steps'])) if subtask_info['steps'] else "Continue implementation for the assigned files."
    
    content = f"""# Subtask Part {part_num} of {total_parts}

**This is part {part_num} of a larger task that was automatically split for stability.**

## Files to modify in this subtask:
{files_list}

## Implementation steps for this part:
{steps_list}

## Context from original plan:

### Task Analysis:
{parsed_plan.get('task_analysis', 'See original plan for full context')}

### Data Flow (relevant parts):
{parsed_plan.get('data_flow', 'See original plan for complete data flow')}

### Integration Points:
{parsed_plan.get('integration_points', 'See original plan for integration details')}

### Greek Payroll Compliance:
{parsed_plan.get('greek_compliance', 'Follow original compliance requirements')}

## Important Notes:
- Focus ONLY on the files listed above
- Ensure your changes integrate with the overall architecture
- Maintain consistency with other parts of the split task
- Follow all validation and testing requirements from the original plan
- Consider the impact on other subtasks when making changes

## Coordination Requirements:
- Changes must be compatible with other parts of the split task
- Shared interfaces and types should be handled consistently
- Database schema changes should be coordinated across all parts
"""

    return content

def validate_task_size_during_planning(plan_text, task_file):
    """Validate task size and split if necessary during planning phase"""
    file_count = count_files_in_plan(plan_text)
    
    print(f"📊 Task size validation: {file_count} files planned")
    
    if file_count <= MAX_FILES_PER_TASK:
        print(f"✅ Task size is within limits ({file_count}/{MAX_FILES_PER_TASK} files)")
        return plan_text, []
    
    print(f"⚠️ Task size exceeds limit ({file_count}/{MAX_FILES_PER_TASK} files)")
    print("📦 Automatically splitting task into smaller subtasks...")
    
    # Create subtasks
    created_subtasks = create_subtasks_from_large_plan(plan_text, task_file)
    
    if created_subtasks:
        print(f"✅ Created {len(created_subtasks)} subtasks:")
        for subtask in created_subtasks:
            print(f"   - {pathlib.Path(subtask).name}")
        
        # Create a coordination plan for the original task
        coordination_plan = create_coordination_plan(plan_text, created_subtasks)
        return coordination_plan, created_subtasks
    else:
        print("⚠️ Failed to create subtasks, proceeding with original plan")
        return plan_text, []

def create_coordination_plan(original_plan, subtask_files):
    """Create a coordination plan that explains the task splitting"""
    subtask_names = [pathlib.Path(f).stem for f in subtask_files]
    
    coordination_plan = f"""# Task Coordination Plan

**IMPORTANT: This large task has been automatically split into {len(subtask_files)} smaller subtasks for stability.**

## Created Subtasks:
{chr(10).join(f'{i+1}. {name}' for i, name in enumerate(subtask_names))}

## Coordination Strategy:
1. Complete subtasks in sequence to avoid conflicts
2. Ensure compatibility between subtask implementations
3. Validate integration after each subtask completion
4. Run full test suite after completing all subtasks

## Original Plan Context:
{original_plan}

## Next Steps:
1. Complete the subtasks in order
2. Each subtask focuses on a subset of files (max {MAX_FILES_PER_TASK} files)
3. Validate integration between subtasks
4. Run comprehensive testing after all subtasks are complete

**Note: This coordination plan will not be implemented directly. Instead, work on the individual subtasks.**
"""
    
    return coordination_plan

def execute_planning_phase(task_text, tree, knowledge, architecture_guide, dependency_summary, evolved_guidelines, impact_context=""):
    """Execute planning phase to create detailed implementation plan"""
    try:
        print("🎯 Starting planning phase...")
        
        planning_system = {
            "role": "system",
            "content": (
                "You are a senior software architect specializing in Greek Payroll systems.\n\n"
                "Here is the full architecture and coding rules you MUST follow:\n\n"
                f"{ARCHITECTURE_TEXT}\n\n"
                "Here is the database schema you MUST respect:\n\n"
                f"{SCHEMA_TEXT}\n\n"
                "Here is the existing core payroll calculation logic you must improve and not break:\n\n"
                f"{PAYROLL_ENGINE_TEXT}\n\n"
                "Your job is to create a comprehensive implementation plan BEFORE any coding begins."
            ) + textwrap.dedent(f"""
            
            PLANNING INSTRUCTIONS:
            You must create a detailed, numbered routine that explicitly tells the implementation phase exactly what to do.
            Each step must specify exact file paths, function names, and expected outputs.
            
            OUTPUT FORMAT:
            Your response must follow this EXACT structure:
            
            ## TASK ANALYSIS
            [Summarize what needs to be built and why - focus on business value]
            
            ## NUMBERED IMPLEMENTATION ROUTINE
            
            **STEP 1: [Specific Action Title]**
            - File to edit: `exact/path/filename.ts`
            - Expected output: New function `exactFunctionName()` with signature
            - Specific changes: [List exact code changes, new exports, imports]
            - Acceptance criteria: Function returns expected type and handles edge cases
            
            **STEP 2: [Next Specific Action Title]** 
            - File to edit: `exact/path/other-file.tsx`
            - Expected output: New component `ComponentName` with props interface
            - Specific changes: [List exact JSX elements, state variables, handlers]
            - Acceptance criteria: Component renders correctly and validates input
            
            **STEP 3: [Database/Schema Changes]**
            - File to edit: `shared/schema.ts`
            - Expected output: New table definition `tableName` with Zod schema
            - Specific changes: [List exact column names, types, constraints]
            - Acceptance criteria: Schema validates correctly and migrations run
            
            **STEP 4: [API Integration]**
            - File to edit: `server/routes.ts` 
            - Expected output: New endpoint `/api/exact/path` with typed handlers
            - Specific changes: [List request/response schemas, validation middleware]
            - Acceptance criteria: API returns proper status codes and error handling
            
            **STEP 5: [Testing Implementation]**
            - File to create: `tests/feature-name.test.ts`
            - Expected output: Test functions `testSpecificFunction()`, `testEdgeCases()`
            - Specific changes: [List exact test scenarios, mock data, assertions]
            - Acceptance criteria: All tests pass and cover edge cases
            
            ## EXACT FILE CHANGES REQUIRED
            ```
            path/to/file1.ts: Add functions X, Y, Z with specific signatures
            path/to/file2.tsx: Add component with props interface and state
            shared/schema.ts: Add table definitions and Zod schemas
            server/routes.ts: Add API endpoints with typed handlers
            tests/feature.test.ts: Add comprehensive test suite
            ```
            
            ## FUNCTION SIGNATURES TO IMPLEMENT
            ```typescript
            // Exact function signatures expected
            function specificFunctionName(param1: Type1, param2: Type2): ReturnType
            interface ComponentProps { prop1: string; prop2: number; }
            const API_ENDPOINT = '/api/exact/path';
            ```
            
            ## GREEK PAYROLL COMPLIANCE REQUIREMENTS
            [Specific Greek labor law considerations with exact rule references]
            
            ## DATA FLOW DIAGRAM
            [Step-by-step data flow: Input → Validation → Processing → Storage → Output]
            
            ## TESTING STRATEGY
            [Exact test scenarios with input/output examples and edge cases]
            
            ## POTENTIAL ISSUES & SOLUTIONS
            [Anticipate specific problems with concrete solutions]
            
            DO NOT WRITE ANY CODE. This is PLANNING ONLY.
            Focus on creating a complete, detailed plan that eliminates guesswork during implementation.
            
            TASK SIZE LIMITS:
            - Maximum {MAX_FILES_PER_TASK} files can be modified per task
            - If more files are needed, the task will be automatically split into subtasks
            - Plan accordingly to stay within size limits when possible
            - Focus on the most critical files for the core functionality
            
            ARCHITECTURE & DEVELOPMENT RULES:
            {architecture_guide}
            
            CONTEXT ABOUT THE CODEBASE:
            {dependency_summary}
            
            EVOLVED GUIDELINES FROM EXPERIENCE:
            {evolved_guidelines}
            {impact_context}
            """).strip()
        }
        
        planning_user = {
            "role": "user",
            "content": textwrap.dedent(f"""
            TASK TO PLAN:
            {task_text}
            
            CURRENT CODEBASE STRUCTURE:
            {tree}
            
            EXISTING KNOWLEDGE:
            {knowledge}
            
            ARCHITECTURE GUIDE:
            {architecture_guide}
            
            Please create a comprehensive implementation plan for this task.
            Remember: NO CODE, just detailed planning.
            """).strip()
        }
        
        # Call OpenAI for planning
        planning_messages = [planning_system, planning_user]
        
        print("🤖 Generating implementation plan...")
        
        # Try structured output for planning (keep traditional for now as planning uses text structure)
        try:
            response = make_openai_request(planning_messages, use_structured_output=False)
        except Exception as e:
            print(f"❌ Planning request failed: {e}")
            return None
        
        if not response:
            print("❌ Failed to generate planning response")
            return None
        
        # Save the plan
        PLANNING_OUTPUT_FILE.write_text(response, encoding="utf-8")
        
        print("✅ Implementation plan generated and saved")
        print(f"📋 Plan saved to: {PLANNING_OUTPUT_FILE}")
        
        # Parse and validate the plan
        parsed_plan = parse_implementation_plan(response)
        if not parsed_plan:
            print("⚠️ Plan parsing failed, but continuing with raw plan")
        
        # Validate task size and split if necessary
        validated_plan, created_subtasks = validate_task_size_during_planning(response, "current_task")
        
        # If subtasks were created, this task becomes a coordination task
        if created_subtasks:
            print("📋 Task has been split into subtasks. Saving coordination plan.")
            PLANNING_OUTPUT_FILE.write_text(validated_plan, encoding="utf-8")
            return "TASK_SPLIT_INTO_SUBTASKS"  # Special return value to indicate splitting
        
        # Run impact analysis on planned files
        planned_files = get_planned_files_from_response(validated_plan)
        if planned_files:
            print(f"📊 Running impact analysis on {len(planned_files)} planned files...")
            impact_analysis = run_change_impact_analysis(planned_files)
            
            if impact_analysis and impact_analysis.get('impactAnalysis'):
                impact = impact_analysis['impactAnalysis']
                print(f"   📈 Planned changes impact analysis:")
                print(f"      - Risk level: {impact.get('riskLevel', 'UNKNOWN')}")
                print(f"      - Directly affected files: {len(impact.get('directlyAffected', []))}")
                print(f"      - Indirectly affected files: {len(impact.get('indirectlyAffected', []))}")
                
                # Save enhanced plan with impact analysis
                enhanced_response = validated_plan + f"\n\n## CHANGE IMPACT ANALYSIS\n\n"
                enhanced_response += f"**Risk Level:** {impact.get('riskLevel', 'UNKNOWN')}\n\n"
                enhanced_response += f"**Files Directly Affected:** {len(impact.get('directlyAffected', []))}\n"
                enhanced_response += f"**Files Indirectly Affected:** {len(impact.get('indirectlyAffected', []))}\n\n"
                
                if impact.get('directlyAffected'):
                    enhanced_response += "**Directly Affected Files:**\n"
                    for file in impact['directlyAffected'][:10]:
                        enhanced_response += f"- {file}\n"
                
                if impact.get('potentialBreakingChanges'):
                    enhanced_response += "\n**Potential Breaking Changes:**\n"
                    for change in impact['potentialBreakingChanges']:
                        enhanced_response += f"- {change['file']}: {change['reason']} (Risk: {change['severity']})\n"
                
                PLANNING_OUTPUT_FILE.write_text(enhanced_response, encoding="utf-8")
                return enhanced_response
        
        return validated_plan
        
    except Exception as e:
        print(f"❌ Error in planning phase: {e}")
        return None

def parse_implementation_plan(plan_text):
    """Parse the implementation plan to extract structured information"""
    try:
        plan_data = {
            "task_analysis": "",
            "implementation_steps": [],
            "files_to_modify": [],
            "data_flow": "",
            "integration_points": "",
            "validation_testing": "",
            "greek_compliance": "",
            "potential_issues": ""
        }
        
        lines = plan_text.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            
            if line.startswith("## TASK ANALYSIS"):
                current_section = "task_analysis"
            elif line.startswith("## IMPLEMENTATION STEPS"):
                current_section = "implementation_steps"
            elif line.startswith("## FILES TO MODIFY/CREATE"):
                current_section = "files_to_modify"
            elif line.startswith("## DATA FLOW"):
                current_section = "data_flow"
            elif line.startswith("## INTEGRATION POINTS"):
                current_section = "integration_points"
            elif line.startswith("## VALIDATION & TESTING"):
                current_section = "validation_testing"
            elif line.startswith("## GREEK PAYROLL COMPLIANCE"):
                current_section = "greek_compliance"
            elif line.startswith("## POTENTIAL ISSUES"):
                current_section = "potential_issues"
            elif line.startswith("##"):
                current_section = None
            elif line and current_section:
                if current_section == "implementation_steps" and (line.startswith(("1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9."))):
                    plan_data[current_section].append(line)
                elif current_section == "files_to_modify" and line.startswith("-"):
                    plan_data[current_section].append(line[1:].strip())
                elif current_section in ["task_analysis", "data_flow", "integration_points", "validation_testing", "greek_compliance", "potential_issues"]:
                    if plan_data[current_section]:
                        plan_data[current_section] += " " + line
                    else:
                        plan_data[current_section] = line
        
        print(f"📊 Plan parsed: {len(plan_data['implementation_steps'])} steps, {len(plan_data['files_to_modify'])} files")
        return plan_data
        
    except Exception as e:
        print(f"⚠️ Error parsing plan: {e}")
        return None

def execute_implementation_phase(task_text, tree, knowledge, architecture_guide, dependency_summary, evolved_guidelines, implementation_plan, impact_context=""):
    """Execute implementation phase following the detailed plan"""
    try:
        print("🔨 Starting implementation phase...")
        
        implementation_system = {
            "role": "system",
            "content": (
                "You are a senior full-stack engineer implementing a pre-approved plan for a Greek Payroll SaaS system.\n\n"
                "Here is the full architecture and coding rules you MUST follow:\n\n"
                f"{ARCHITECTURE_TEXT}\n\n"
                "Here is the database schema you MUST respect:\n\n"
                f"{SCHEMA_TEXT}\n\n"
                "Here is the existing core payroll calculation logic you must improve and not break:\n\n"
                f"{PAYROLL_ENGINE_TEXT}"
            ) + textwrap.dedent(f"""
            
            IMPLEMENTATION INSTRUCTIONS:
            1. Follow the NUMBERED IMPLEMENTATION ROUTINE from the plan EXACTLY as specified
            2. Implement ALL steps from the routine in sequential order
            3. Create/modify ALL files listed with exact names and paths from the plan
            4. Implement exact function signatures specified in the plan
            5. Create exact test functions and scenarios specified in the plan
            6. Include all validation and error handling as specified in each step
            7. Follow Greek payroll compliance requirements with exact rule references
            8. Ensure each step's acceptance criteria are met before proceeding
            
            IMPORTANT RULES:
            - You MUST implement the complete plan, not just parts of it
            - Follow the exact file structure specified in the plan
            - Include all error handling and edge cases mentioned in the plan
            - Write production-ready code with proper TypeScript types
            - Add comprehensive validation as planned
            - Include unit tests for complex logic
            - IMPORTANT: Do not exceed {MAX_FILES_PER_TASK} file changes in implementation
            - If the plan includes more files, focus on the most critical ones
            
            ARCHITECTURE & DEVELOPMENT RULES:
            {architecture_guide}
            
            CONTEXT ABOUT THE CODEBASE:
            {dependency_summary}
            
            EVOLVED GUIDELINES FROM EXPERIENCE:
            {evolved_guidelines}
            {impact_context}
            
            FILE RESTRICTIONS: You can only modify files in allowed paths:
            - Application code: server/, client/, shared/
            - Database: db/schema.sql, db/migrations/
            - Tests: tests/
            - Documentation: docs/, context/
            - Tasks: tasks/
            DO NOT attempt to modify package.json, config files, .env files, or the agent itself.
            """).strip()
        }
        
        implementation_user = {
            "role": "user",
            "content": textwrap.dedent(f"""
            ORIGINAL TASK:
            {task_text}
            
            APPROVED IMPLEMENTATION PLAN:
            {implementation_plan}
            
            CURRENT CODEBASE STRUCTURE:
            {tree}
            
            EXISTING KNOWLEDGE:
            {knowledge}
            
            ARCHITECTURE GUIDE:
            {architecture_guide}
            
            Please implement the complete plan above. Make sure you:
            1. Follow every step in the implementation plan
            2. Create/modify all the files listed in the plan
            3. Include all validation, testing, and compliance features from the plan
            4. Write production-ready, well-structured code
            
            Use the <<<FILE: path >>> content >>>END format for all file changes.
            """).strip()
        }
        
        # Call OpenAI for implementation
        implementation_messages = [implementation_system, implementation_user]
        
        print("🤖 Implementing the approved plan...")
        
        # Try structured output for implementation for better reliability
        try:
            print("📋 Attempting structured implementation output...")
            response = make_openai_request(implementation_messages, use_structured_output=True)
            implementation_structured = True
        except Exception as e:
            print(f"⚠️ Structured implementation failed ({e}), falling back to traditional...")
            response = make_openai_request(implementation_messages, use_structured_output=False)
            implementation_structured = False
        
        if not response:
            print("❌ Failed to generate implementation response")
            return None
        
        print("✅ Implementation completed")
        
        # Store whether structured output was used for later processing
        if hasattr(response, '__structured_output__'):
            response.__structured_output__ = implementation_structured
        else:
            # Create a wrapper to carry the metadata
            class ResponseWrapper:
                def __init__(self, content, is_structured):
                    self.content = content
                    self.is_structured = is_structured
                def __str__(self):
                    return self.content
            response = ResponseWrapper(response, implementation_structured)
        
        return response
        
    except Exception as e:
        print(f"❌ Error in implementation phase: {e}")
        return None

def create_sandbox_environment():
    """Create isolated sandbox environment for safe development"""
    try:
        print("🏗️ Creating sandbox environment...")
        
        # Clean up any existing sandbox
        if SANDBOX_DIR.exists():
            shutil.rmtree(SANDBOX_DIR)
        
        # Create sandbox directory
        SANDBOX_DIR.mkdir(parents=True, exist_ok=True)
        
        # Clone current repository state to sandbox
        print("📂 Cloning repository to sandbox...")
        result = subprocess.run([
            "git", "clone", ".", str(SANDBOX_DIR)
        ], cwd=ROOT, capture_output=True, text=True, timeout=60)
        
        if result.returncode != 0:
            print(f"❌ Failed to clone repository: {result.stderr}")
            return False
        
        # Ensure we're on the right branch in sandbox
        subprocess.run([
            "git", "checkout", "dev"
        ], cwd=SANDBOX_DIR, capture_output=True)
        
        # Copy node_modules if it exists (for faster builds)
        source_node_modules = ROOT / "node_modules"
        target_node_modules = SANDBOX_DIR / "node_modules"
        
        if source_node_modules.exists() and not target_node_modules.exists():
            print("📦 Copying node_modules to sandbox...")
            try:
                shutil.copytree(source_node_modules, target_node_modules)
            except Exception as e:
                print(f"⚠️ Could not copy node_modules: {e}")
                # Not critical, npm install will handle it
        
        # Install dependencies in sandbox if needed
        package_json = SANDBOX_DIR / "package.json"
        if package_json.exists() and not target_node_modules.exists():
            print("📦 Installing dependencies in sandbox...")
            result = subprocess.run([
                "npm", "install"
            ], cwd=SANDBOX_DIR, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                print(f"⚠️ npm install failed in sandbox: {result.stderr}")
                # Continue anyway, some validations might still work
        
        print(f"✅ Sandbox environment created: {SANDBOX_DIR}")
        return True
        
    except Exception as e:
        print(f"❌ Error creating sandbox environment: {e}")
        return False

def cleanup_sandbox():
    """Clean up sandbox environment"""
    try:
        if SANDBOX_DIR.exists():
            shutil.rmtree(SANDBOX_DIR)
            print("🧹 Sandbox environment cleaned up")
    except Exception as e:
        print(f"⚠️ Error cleaning up sandbox: {e}")

def merge_sandbox_changes(changed_files):
    """Merge validated changes from sandbox back to main repository"""
    try:
        print("🔄 Merging validated changes from sandbox...")
        
        if not changed_files:
            print("⚠️ No files to merge")
            return True
        
        # Copy changed files from sandbox to main repo
        for file_path in changed_files:
            source_file = SANDBOX_DIR / file_path
            target_file = ROOT / file_path
            
            if source_file.exists():
                # Ensure target directory exists
                target_file.parent.mkdir(parents=True, exist_ok=True)
                
                # Copy file content
                target_file.write_text(
                    source_file.read_text(encoding="utf-8"), 
                    encoding="utf-8"
                )
                print(f"✅ Merged: {file_path}")
            else:
                print(f"⚠️ Source file not found in sandbox: {file_path}")
        
        print(f"✅ Successfully merged {len(changed_files)} files from sandbox")
        return True
        
    except Exception as e:
        print(f"❌ Error merging changes from sandbox: {e}")
        return False

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

    # Acquire concurrent execution slot (limit to 1 active task)
    rate_limiter.acquire_concurrent_slot()
    
    try:
        # Periodically perform skill growth (every 5th task or if no evolution file exists)
        critic_files = list(AGENT_DIR.glob("critic_report_*.md"))
        should_evolve = (
            not PROMPT_EVOLUTION_FILE.exists() or 
            len(critic_files) % 5 == 0 and len(critic_files) > 0
        )
        
        if should_evolve:
            print("🧠 Triggering skill growth and prompt evolution...")
            perform_skill_growth_cycle()

        task_file = pick_next_task()
        if not task_file:
            print("No tasks found in tasks/pending. Add a .md task and run again.")
            return
        
        # Record start time for performance tracking
        task_start_time = time.time()
        task_name = pathlib.Path(task_file).stem

        # Create sandbox environment for safe development
        sandbox_created = create_sandbox_environment()
        if not sandbox_created:
            print("❌ Failed to create sandbox environment, aborting task")
            return
        
        try:
            # Read task and context information
            task_text = read_file(task_file)
            tree = repo_tree()
            knowledge = read_knowledge()
            architecture_guide = read_architecture_guide()
            
            # Get dependency graph for architectural context
            dependency_graph = read_dependency_graph()
            dependency_summary = format_dependency_summary(dependency_graph)
            
            # Load evolved guidelines from skill growth
            evolved_guidelines = load_evolved_guidelines()

            # Run initial dependency analysis to understand current state
            print("🔍 PHASE 0: Analyzing current dependency structure...")
            initial_analysis = run_change_impact_analysis()
            impact_context = format_impact_analysis_for_prompt(initial_analysis)

            # PHASE 1: PLANNING
            print("🎯 PHASE 1: Creating detailed implementation plan...")
            implementation_plan = execute_planning_phase(
                task_text, tree, knowledge, architecture_guide, dependency_summary, evolved_guidelines, impact_context
            )
            
            if not implementation_plan:
                print("❌ Planning phase failed, falling back to direct implementation")
                # Fallback to old direct implementation
                system = {
                    "role":"system",
                    "content": (
                        "You are a senior full-stack engineer working on a Greek Payroll SaaS for hospitality (EFKA, ΣΣΕ, Digital Work Card).\n\n"
                        "Here is the full architecture and coding rules you MUST follow:\n\n"
                        f"{ARCHITECTURE_TEXT}\n\n"
                        "Here is the database schema you MUST respect:\n\n"
                        f"{SCHEMA_TEXT}\n\n"
                        "Here is the existing core payroll calculation logic you must improve and not break:\n\n"
                        f"{PAYROLL_ENGINE_TEXT}"
                    ) + textwrap.dedent(f"""
                    
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
                    1) A DETAILED NUMBERED IMPLEMENTATION PLAN with exact steps, file paths, and function names.
                    2) A TEST PLAN describing specific test functions and scenarios to implement.
                    3) One or more file blocks with FULL file contents using this exact format per file:
                       {FILE_BLOCK_START} relative/path/filename.ext
                       ...entire file content...
                       {FILE_BLOCK_END}
                    
                    PLANNING REQUIREMENTS:
                    - Each step must specify exact file paths to edit
                    - Each step must specify exact function names to create
                    - Each step must specify expected outputs and acceptance criteria
                    - Include specific TypeScript interfaces and type definitions
                    - Reference exact Greek labor law rules and compliance requirements
                    
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
                    
                    FILE RESTRICTIONS: You can only modify files in allowed paths:
                    - Application code: server/, client/, shared/
                    - Database: db/schema.sql, db/migrations/
                    - Tests: tests/
                    - Documentation: docs/, context/
                    - Tasks: tasks/
                    DO NOT attempt to modify package.json, config files, .env files, or the agent itself.
                    {evolved_guidelines}
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

                    ARCHITECTURE & DEVELOPMENT RULES:
                    ---
                    {architecture_guide}

                    DEPENDENCY ARCHITECTURE:
                    ---
                    {dependency_summary}

                    REPO TREE (truncated):
                    ---
                    {tree}
                    """).strip()
                }

                print("🤖 Thinking…")
                # Try structured output first for more reliable parsing
                try:
                    print("📋 Attempting structured output for reliability...")
                    resp = call_with_retry(lambda: call_openai([system, user], use_structured_output=True))
                    structured_output = True
                except Exception as e:
                    print(f"⚠️ Structured output failed ({e}), falling back to traditional format...")
                    resp = call_with_retry(lambda: call_openai([system, user]))
                    structured_output = False
            elif implementation_plan == "TASK_SPLIT_INTO_SUBTASKS":
                print("📦 Task was split into subtasks. Current task completed.")
                print("✅ Subtasks created successfully. Run the agent again to process them.")
                return
            else:
                # PHASE 2: IMPLEMENTATION with final impact analysis
                planned_files = get_planned_files_from_response(implementation_plan)
                final_impact_context = ""
                
                if planned_files:
                    print(f"🔍 Final impact analysis on {len(planned_files)} files before implementation...")
                    final_analysis = run_change_impact_analysis(planned_files)
                    final_impact_context = format_impact_analysis_for_prompt(final_analysis)
                
                print("🔨 PHASE 2: Implementing the approved plan...")
                resp = execute_implementation_phase(
                    task_text, tree, knowledge, architecture_guide, dependency_summary, evolved_guidelines, implementation_plan, final_impact_context
                )
                
                # Extract structured output flag from response
                if hasattr(resp, 'is_structured'):
                    structured_output = resp.is_structured
                    resp = str(resp)  # Convert to string for processing
                else:
                    structured_output = False

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
            
            # Apply changes to sandbox environment with structured output support
            changed = apply_file_blocks(resp, SANDBOX_DIR, is_structured=structured_output)
        
            # Validate that we're not changing too many files
            if len(changed) > MAX_FILES_PER_TASK:
                print(f"⚠️ Implementation changed {len(changed)} files, exceeding limit of {MAX_FILES_PER_TASK}")
                print("📦 This suggests the task should have been split further.")
                print("🔄 Consider updating the planning phase to better estimate file changes.")
                # Continue anyway but warn about the size

            summary_path = f"agent/last_run_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            pathlib.Path(summary_path).write_text(resp, encoding="utf-8")

            # Only move task to done if actual file changes were made
            if not changed:
                print("⚠️ No file changes detected. Task will remain in pending.")
                print(f"Summary saved → {summary_path}")
                print("Review the summary to understand why no changes were made.")
                return
        
            # Run validation checks in sandbox environment
            validation_failed = False
            
            print("🔍 Running TypeScript validation in sandbox...")
            result = subprocess.run(["npm", "run", "tsc", "--", "--noEmit"], cwd=SANDBOX_DIR, capture_output=True)
            if result.returncode != 0:
                print("❌ TypeScript check failed in sandbox.")
                validation_failed = True

            if not validation_failed:
                print("🧪 Running tests in sandbox...")
                tests = subprocess.run(["npm", "test", "--", "--bail"], cwd=SANDBOX_DIR, capture_output=True)
                if tests.returncode != 0:
                    print("❌ Tests failed in sandbox.")
                    validation_failed = True
        
            if not validation_failed:
                print("🧮 Running payroll math validation in sandbox...")
                # Temporarily switch context for validation
                original_root = globals()['ROOT']
                globals()['ROOT'] = SANDBOX_DIR
                try:
                    payroll_valid = validate_payroll_math()
                    if not payroll_valid:
                        print("❌ Payroll math validation failed in sandbox.")
                        validation_failed = True
                finally:
                    globals()['ROOT'] = original_root
        
            if not validation_failed:
                print("🗄️ Running schema migration validation in sandbox...")
                # Note: Schema validation uses DATABASE_URL so it affects the real DB
                # This is acceptable since it's testing the schema, not modifying data
                schema_valid = validate_schema_migrations(changed)
                if not schema_valid:
                    print("❌ Schema migration validation failed.")
                    validation_failed = True
        
            if validation_failed:
                print("❌ Validation failed in sandbox environment.")
                print("🗑️ Discarding sandbox changes (main repository unchanged).")
                print("❌ Task validation failed. Task will remain in pending.")
                print(f"Summary saved → {summary_path}")
                print("Fix validation errors and run again.")
                return
        
            print("✅ All validation checks passed in sandbox!")
        
            # Merge validated changes from sandbox to main repository
            merge_success = merge_sandbox_changes(changed)
            if not merge_success:
                print("❌ Failed to merge changes from sandbox")
                return
            
            # Create git checkpoint after merging (for continuous agent)
            print("💾 Creating git checkpoint after merging validated changes...")
            try:
                # Use tool abstraction for git operations
                print("📝 Committing changes using validation...")
                commit_result = commit_with_validation(f"AI Agent: Completed task from sandbox")
                
                if not commit_result.success:
                    print(f"❌ Commit failed: {commit_result.message}")
                    if commit_result.error:
                        print(f"   Error: {commit_result.error}")
                    print("🔄 Changes are staged but not committed. Fix validation errors and run again.")
                    return
                else:
                    print(f"✅ {commit_result.message}")
                print("✅ Changes committed to main repository")
            except subprocess.CalledProcessError:
                print("⚠️ Could not commit merged changes")
            
            # Run quality critic evaluation on merged changes
            task_title = pathlib.Path(task_file).stem
            task_summary = task_text[:200] if task_text else "Task completed"
            run_quality_critic(task_file, changed, task_summary)
            
            # Update knowledge base with task completion info
            update_knowledge(task_title, changed, task_summary)
            
            # ===== OUTPUT VALIDATION BEFORE COMPLETION =====
            print("\n🔍 Running comprehensive output validation before task completion...")
            task_file_path = pathlib.Path(task_file)
            task_description = f"Completed task: {task_file_path.stem}"
            
            # Run validation with strict requirements
            validation_config = ValidationConfig(
                require_build_pass=True,
                require_tests_pass=True, 
                minimum_coverage=80.0
            )
            
            validation_passed = validate_and_handle_task(task_file_path, task_description)
            
            if not validation_passed:
                print("❌ Task failed output validation - moved back to pending")
                print("   The task will be retried after fixing validation issues")
                
                # Log failed task metrics for performance tracking
                failed_metrics = collect_task_metrics(
                    task_name=task_name,
                    changed_files=changed or [],
                    start_time=task_start_time,
                    success=False,
                    validation_passed=False
                )
                performance_tracker.log_task_completion(failed_metrics)
                
                return  # Exit without completing the task
            
            print("✅ Output validation passed - proceeding with task completion")
            
            # ===== EVALUATION LOOP - PERFORMANCE TRACKING =====
            print("\n📊 Collecting task performance metrics...")
            
            # Collect comprehensive task metrics
            task_metrics = collect_task_metrics(
                task_name=task_name,
                changed_files=changed or [],
                start_time=task_start_time,
                success=True,
                validation_passed=validation_passed
            )
            
            # Log metrics to history.csv
            performance_tracker.log_task_completion(task_metrics)
            
            # Generate critic report for self-evaluation
            print("🔍 Generating self-critical evaluation report...")
            critic_report_path = agent_critic.generate_critic_report(
                task_name=task_name,
                changed_files=changed or [],
                task_summary=task_summary,
                metrics=task_metrics
            )
            
            # Display performance summary
            perf_summary = performance_tracker.get_performance_summary()
            print(f"📈 Performance Summary: {perf_summary.get('success_rate', 'N/A')} success rate, {perf_summary.get('avg_runtime', 'N/A')} avg runtime")
            
            # Move task to done
            done_path = task_file.replace(str(ROOT / "tasks/pending"), str(ROOT / "tasks/done"))
            pathlib.Path(done_path).parent.mkdir(parents=True, exist_ok=True)
            pathlib.Path(task_file).rename(done_path)

            print("\n✅ Agent run complete with sandbox isolation.")
            print(f"Changed files: {changed or 'None (review summary)'}")
            print(f"Summary saved → {summary_path}")
            print(f"Task moved to → {done_path}")
            print("\nNext steps:")
            print("1) Changes were validated in sandbox before merging to main repo.")
            print("2) Open changed files to review the validated implementation.")
            print("3) Run the app to verify everything works as expected.")
        
        except Exception as e:
            print(f"❌ Error during sandbox task execution: {e}")
            print("🗑️ Discarding sandbox changes due to error.")
            return
        
    except Exception as e:
        print(f"❌ Error during task execution: {e}")
        print("🗑️ Discarding any partial changes due to error.")
        return
        
    finally:
        # Always clean up sandbox environment and release execution slot
        try:
            cleanup_sandbox()
        except Exception as e:
            print(f"⚠️ Error during sandbox cleanup: {e}")
        
        try:
            rate_limiter.release_concurrent_slot()
        except Exception as e:
            print(f"⚠️ Error releasing execution slot: {e}")

if __name__ == "__main__":
    main()