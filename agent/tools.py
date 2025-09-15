#!/usr/bin/env python3
"""
Tool abstractions for the continuous agent system.
Each tool wraps a major capability (git, build, test, etc.) as a reusable function.
"""

import subprocess
import time
import json
import os
import pathlib
import shutil
import re
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass
from datetime import datetime

# Define ROOT and utility functions to avoid circular imports
ROOT = pathlib.Path(__file__).resolve().parents[1]

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

@dataclass
class ToolResult:
    """Standardized result object for all tools"""
    success: bool
    message: str
    data: Optional[Any] = None
    error: Optional[str] = None
    duration: Optional[float] = None

class GitTool:
    """Git operations tool"""
    
    @staticmethod
    def safe_run_git(cmd: List[str], cwd: Optional[pathlib.Path] = None) -> subprocess.CompletedProcess:
        """Run git command safely with secret masking"""
        try:
            result = subprocess.run(
                cmd, 
                cwd=cwd or ROOT,
                capture_output=True, 
                text=True, 
                check=True
            )
            return result
        except subprocess.CalledProcessError as e:
            clean_error = mask_secrets(e.stderr or "")
            print(f"⚠️ Git error: {clean_error}")
            raise

    @staticmethod
    def clone_repository(repo_url: str, target_dir: pathlib.Path) -> ToolResult:
        """Clone a repository to target directory"""
        start_time = time.time()
        try:
            print(f"📥 Cloning repository to {target_dir}")
            result = GitTool.safe_run_git(["git", "clone", repo_url, str(target_dir)])
            duration = time.time() - start_time
            return ToolResult(
                success=True,
                message=f"Repository cloned successfully in {duration:.1f}s",
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message=f"Failed to clone repository",
                error=str(e),
                duration=duration
            )

    @staticmethod
    def commit_changes(message: str, cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Add all changes and commit with message"""
        start_time = time.time()
        try:
            working_dir = cwd or ROOT
            print(f"📝 Committing changes: {message}")
            
            # Add all changes
            GitTool.safe_run_git(["git", "add", "."], cwd=working_dir)
            
            # Commit with message
            GitTool.safe_run_git(["git", "commit", "-m", message], cwd=working_dir)
            
            duration = time.time() - start_time
            return ToolResult(
                success=True,
                message=f"Changes committed successfully in {duration:.1f}s",
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Failed to commit changes",
                error=str(e),
                duration=duration
            )

    @staticmethod
    def get_diff(cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Get git diff of current changes"""
        start_time = time.time()
        try:
            working_dir = cwd or ROOT
            result = GitTool.safe_run_git(["git", "diff", "--cached"], cwd=working_dir)
            duration = time.time() - start_time
            
            return ToolResult(
                success=True,
                message=f"Git diff retrieved in {duration:.1f}s",
                data=result.stdout,
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Failed to get git diff",
                error=str(e),
                duration=duration
            )

    @staticmethod
    def stash_changes(message: str = "Auto-stash", cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Stash current changes"""
        start_time = time.time()
        try:
            working_dir = cwd or ROOT
            print(f"💾 Stashing changes: {message}")
            result = GitTool.safe_run_git(["git", "stash", "push", "-m", message], cwd=working_dir)
            duration = time.time() - start_time
            
            return ToolResult(
                success=True,
                message=f"Changes stashed successfully in {duration:.1f}s",
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Failed to stash changes",
                error=str(e),
                duration=duration
            )

class BuildTool:
    """Build and compilation operations tool"""
    
    @staticmethod
    def run_npm_command(command: List[str], timeout: int = 180, cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Run npm command with proper error handling and logging"""
        start_time = time.time()
        working_dir = cwd or ROOT
        
        try:
            print(f"🔧 Running: {' '.join(command)}")
            result = subprocess.run(
                command,
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            duration = time.time() - start_time
            
            if result.returncode == 0:
                return ToolResult(
                    success=True,
                    message=f"Command completed successfully in {duration:.1f}s",
                    data=result.stdout,
                    duration=duration
                )
            else:
                safe_log_subprocess_output(result, ' '.join(command))
                return ToolResult(
                    success=False,
                    message=f"Command failed with exit code {result.returncode}",
                    error=result.stderr,
                    duration=duration
                )
                
        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message=f"Command timed out after {timeout}s",
                error="Timeout",
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Command execution failed",
                error=str(e),
                duration=duration
            )

    @staticmethod
    def typescript_check(cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Run TypeScript compilation check"""
        print("📋 TypeScript compilation check...")
        return BuildTool.run_npm_command(["npm", "run", "check"], timeout=120, cwd=cwd)

    @staticmethod
    def build_project(cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Build the project with static analysis validation"""
        print("🏗️ Building project with static analysis...")
        working_dir = cwd or ROOT
        
        # 1. Run ESLint check
        print("🔍 Running ESLint static analysis...")
        lint_result = BuildTool.run_eslint(cwd)
        if not lint_result.success:
            return lint_result
        
        # 2. Run Prettier format check
        print("📐 Running Prettier format check...")
        format_result = BuildTool.run_prettier_check(cwd)
        if not format_result.success:
            return format_result
        
        # 3. Run TypeScript check
        print("🔍 Running TypeScript compilation check...")
        ts_result = BuildTool.typescript_check(cwd)
        if not ts_result.success:
            return ts_result
        
        # 4. Run build command
        print("🔧 Running build process...")
        result = BuildTool.run_npm_command(["npm", "run", "build"], timeout=180, cwd=cwd)
        
        # Clean up build artifacts to avoid repo pollution
        if result.success:
            try:
                build_dir = working_dir / "dist"
                if build_dir.exists():
                    shutil.rmtree(build_dir)
                    print("   🧹 Cleaned up build artifacts")
            except Exception:
                pass  # Don't fail the build for cleanup issues
                
        return result
    
    @staticmethod
    def run_eslint(cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Run ESLint static analysis"""
        start_time = time.time()
        working_dir = cwd or ROOT
        
        try:
            result = subprocess.run(
                ["npx", "eslint", ".", "--ext", ".ts,.tsx,.js,.jsx", "--max-warnings", "0"],
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            duration = time.time() - start_time
            
            if result.returncode == 0:
                return ToolResult(
                    success=True,
                    message=f"ESLint passed - no linting errors in {duration:.1f}s",
                    duration=duration
                )
            else:
                safe_log_subprocess_output(result, "ESLint")
                return ToolResult(
                    success=False,
                    message="ESLint failed - linting errors found",
                    error=result.stdout + "\n" + result.stderr,
                    duration=duration
                )
                
        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="ESLint timed out",
                error="ESLint process exceeded timeout",
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="ESLint error",
                error=str(e),
                duration=duration
            )
    
    @staticmethod
    def run_prettier_check(cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Run Prettier format check"""
        start_time = time.time()
        working_dir = cwd or ROOT
        
        try:
            result = subprocess.run(
                ["npx", "prettier", "--check", "."],
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            duration = time.time() - start_time
            
            if result.returncode == 0:
                return ToolResult(
                    success=True,
                    message=f"Prettier check passed - code is properly formatted in {duration:.1f}s",
                    duration=duration
                )
            else:
                safe_log_subprocess_output(result, "Prettier check")
                return ToolResult(
                    success=False,
                    message="Prettier check failed - code formatting issues found",
                    error=result.stdout + "\n" + result.stderr,
                    duration=duration
                )
                
        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Prettier check timed out",
                error="Prettier process exceeded timeout",
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Prettier check error",
                error=str(e),
                duration=duration
            )
    
    @staticmethod
    def run_static_analysis(cwd: Optional[pathlib.Path] = None) -> Dict[str, ToolResult]:
        """Run comprehensive static analysis checks"""
        print("🔍 Running comprehensive static analysis...")
        
        results = {}
        
        # Run ESLint
        results['eslint'] = BuildTool.run_eslint(cwd)
        
        # Run Prettier check
        results['prettier'] = BuildTool.run_prettier_check(cwd)
        
        # Run TypeScript check
        results['typescript'] = BuildTool.typescript_check(cwd)
        
        return results

    @staticmethod
    def install_dependencies(cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Install npm dependencies"""
        print("📦 Installing dependencies...")
        return BuildTool.run_npm_command(["npm", "install"], timeout=300, cwd=cwd)

    @staticmethod
    def generate_database_schema(cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Generate database schema based on available tools"""
        working_dir = cwd or ROOT
        package_json = working_dir / "package.json"
        
        if not package_json.exists():
            return ToolResult(
                success=False,
                message="No package.json found",
                error="Package file missing"
            )
        
        try:
            package_data = json.loads(package_json.read_text())
            scripts = package_data.get("scripts", {})
            
            # Try different schema generation methods
            if "db:generate" in scripts:
                print("🔧 Running db:generate...")
                return BuildTool.run_npm_command(["npm", "run", "db:generate"], timeout=60, cwd=cwd)
            elif "prisma" in scripts and "generate" in scripts["prisma"]:
                print("🔧 Running prisma generate...")
                return BuildTool.run_npm_command(["npm", "run", "prisma", "generate"], timeout=60, cwd=cwd)
            elif "drizzle-kit" in package_data.get("dependencies", {}) or "drizzle-kit" in package_data.get("devDependencies", {}):
                print("🔧 Running drizzle-kit generate...")
                return BuildTool.run_npm_command(["npx", "drizzle-kit", "generate"], timeout=60, cwd=cwd)
            else:
                return ToolResult(
                    success=True,
                    message="No database schema generation needed",
                    data="Skipped - no schema tools found"
                )
                
        except Exception as e:
            return ToolResult(
                success=False,
                message="Failed to generate database schema",
                error=str(e)
            )

class TestTool:
    """Testing operations tool"""
    
    @staticmethod
    def run_tests(test_pattern: Optional[str] = None, cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Run Jest test suite"""
        print("🧪 Running Jest tests...")
        command = ["npx", "jest", "--passWithNoTests"]
        if test_pattern:
            command.extend(["--testNamePattern", test_pattern])
        
        return BuildTool.run_npm_command(command, timeout=300, cwd=cwd)
    
    @staticmethod
    def run_tests_with_coverage(test_pattern: Optional[str] = None, cwd: Optional[pathlib.Path] = None) -> ToolResult:
        """Run Jest tests with coverage collection"""
        print("🧪 Running Jest tests with coverage...")
        command = ["npx", "jest", "--coverage", "--passWithNoTests"]
        if test_pattern:
            command.extend(["--testNamePattern", test_pattern])
        
        return BuildTool.run_npm_command(command, timeout=300, cwd=cwd)

    @staticmethod
    def validate_schema_files(schema_files: List[pathlib.Path]) -> ToolResult:
        """Validate TypeScript schema files"""
        start_time = time.time()
        print("📋 Validating schema files...")
        
        failed_files = []
        for schema_file in schema_files:
            if schema_file.exists():
                try:
                    result = subprocess.run(
                        ["npx", "tsc", "--noEmit", "--skipLibCheck", str(schema_file)],
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    
                    if result.returncode == 0:
                        print(f"   ✅ {schema_file.name} syntax valid")
                    else:
                        print(f"   ❌ {schema_file.name} syntax errors")
                        safe_log_subprocess_output(result, f"{schema_file.name} validation")
                        failed_files.append(schema_file.name)
                        
                except Exception as e:
                    print(f"   ❌ {schema_file.name} validation error: {e}")
                    failed_files.append(schema_file.name)
        
        duration = time.time() - start_time
        
        if failed_files:
            return ToolResult(
                success=False,
                message=f"Schema validation failed for: {', '.join(failed_files)}",
                error=f"Failed files: {failed_files}",
                duration=duration
            )
        else:
            return ToolResult(
                success=True,
                message=f"All schema files valid ({len(schema_files)} checked)",
                duration=duration
            )

    @staticmethod
    def run_payroll_math_validation(files_content: Dict[str, str]) -> ToolResult:
        """Run payroll math validation using Node.js"""
        start_time = time.time()
        print("🧮 Running payroll math validation...")
        
        # Create temporary test file
        test_content = f"""
const fs = require('fs');
const path = require('path');

try {{
    // Mock file content for validation
    const files = {json.dumps(files_content)};
    
    // Basic Greek payroll validation logic
    console.log('SKIP: Payroll math validation not implemented yet');
    process.exit(0);
}} catch (error) {{
    console.error('Validation error:', error.message);
    process.exit(1);
}}
"""
        
        test_file = ROOT / "temp_payroll_test.js"
        
        try:
            test_file.write_text(test_content)
            
            result = subprocess.run(
                ["node", "temp_payroll_test.js"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # Clean up test file
            test_file.unlink(missing_ok=True)
            
            duration = time.time() - start_time
            output = result.stdout.strip()
            
            if "SKIP:" in output:
                return ToolResult(
                    success=True,
                    message=f"Payroll validation skipped: {output}",
                    data="skipped",
                    duration=duration
                )
            elif result.returncode == 0:
                return ToolResult(
                    success=True,
                    message=f"Payroll math validation passed: {output}",
                    data=output,
                    duration=duration
                )
            else:
                return ToolResult(
                    success=False,
                    message=f"Payroll math validation failed: {output}",
                    error=result.stderr,
                    duration=duration
                )
                
        except subprocess.TimeoutExpired:
            test_file.unlink(missing_ok=True)
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Payroll validation timed out",
                error="Timeout after 30s",
                duration=duration
            )
        except Exception as e:
            test_file.unlink(missing_ok=True)
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Payroll validation error",
                error=str(e),
                duration=duration
            )

class DatabaseTool:
    """Database operations tool"""
    
    @staticmethod
    def test_connection(database_url: Optional[str] = None) -> ToolResult:
        """Test database connection"""
        start_time = time.time()
        print("🗄️ Testing database connection...")
        
        db_url = database_url or os.environ.get("DATABASE_URL")
        if not db_url:
            duration = time.time() - start_time
            return ToolResult(
                success=True,
                message="No DATABASE_URL found, skipping database test",
                data="skipped",
                duration=duration
            )
        
        try:
            # Try neon client first
            try:
                # Note: neon import commented out due to availability issues
                # from neon import neon
                # with neon(db_url) as conn:
                #     with conn.cursor() as cur:
                #         cur.execute("SELECT 1")
                #         result = cur.fetchone()
                #         if result and result[0] == 1:
                #             duration = time.time() - start_time
                #             return ToolResult(
                #                 success=True,
                #                 message=f"Database connection successful in {duration:.1f}s",
                #                 duration=duration
                #             )
                pass
            except ImportError:
                pass
                
            # Fallback to Node.js method
            result = subprocess.run(
                ["node", "-e", """
                const { neon } = require('@neondatabase/serverless');
                const sql = neon(process.env.DATABASE_URL);
                sql`SELECT 1`.then(() => {
                    console.log('DB_OK');
                    process.exit(0);
                }).catch((e) => {
                    console.error('DB_ERROR:', e.message);
                    process.exit(1);
                });
                """],
                capture_output=True,
                text=True,
                timeout=30,
                env=dict(os.environ, DATABASE_URL=db_url)
            )
            
            duration = time.time() - start_time
            
            if result.returncode == 0 and "DB_OK" in result.stdout:
                return ToolResult(
                    success=True,
                    message=f"Database connection successful in {duration:.1f}s",
                    duration=duration
                )
            else:
                safe_log_subprocess_output(result, "Database connection")
                return ToolResult(
                    success=False,
                    message="Database connection failed",
                    error=result.stderr,
                    duration=duration
                )
                    
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Database connection error",
                error=str(e),
                duration=duration
            )

    @staticmethod
    def run_migration(schema_file: pathlib.Path, database_url: Optional[str] = None) -> ToolResult:
        """Run database migration from schema file"""
        start_time = time.time()
        print(f"🗄️ Running migration: {schema_file}")
        
        db_url = database_url or os.environ.get("DATABASE_URL")
        if not db_url:
            return ToolResult(
                success=False,
                message="No DATABASE_URL available for migration",
                error="Missing database URL"
            )
        
        if not schema_file.exists():
            return ToolResult(
                success=False,
                message=f"Schema file not found: {schema_file}",
                error="Schema file missing"
            )
        
        try:
            result = subprocess.run(
                ["psql", db_url, "-f", str(schema_file)],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            duration = time.time() - start_time
            
            if result.returncode == 0:
                return ToolResult(
                    success=True,
                    message=f"Migration completed successfully in {duration:.1f}s",
                    duration=duration
                )
            else:
                safe_log_subprocess_output(result, "Schema migration")
                return ToolResult(
                    success=False,
                    message="Schema migration failed",
                    error=result.stderr,
                    duration=duration
                )
                
        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Migration timed out",
                error="Timeout after 30s",
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Migration error",
                error=str(e),
                duration=duration
            )

class CodebaseTool:
    """Codebase analysis and file operations tool"""
    
    @staticmethod
    def search_codebase(pattern: str, file_extensions: Optional[List[str]] = None) -> ToolResult:
        """Search codebase for patterns"""
        start_time = time.time()
        print(f"🔍 Searching codebase for: {pattern}")
        
        extensions = file_extensions if file_extensions is not None else ["ts", "tsx", "js", "jsx"]
        
        try:
            # Use ripgrep if available, otherwise fallback to grep
            command = [
                "rg", "--json", "--type-add", f"code:*.{{{','.join(extensions)}}}", 
                "--type", "code", pattern
            ]
            
            try:
                result = subprocess.run(
                    command,
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    # Parse ripgrep JSON output
                    matches = []
                    for line in result.stdout.strip().split('\n'):
                        if line:
                            try:
                                data = json.loads(line)
                                if data.get('type') == 'match':
                                    matches.append({
                                        'file': data['data']['path']['text'],
                                        'line': data['data']['line_number'],
                                        'text': data['data']['lines']['text']
                                    })
                            except json.JSONDecodeError:
                                continue
                    
                    duration = time.time() - start_time
                    return ToolResult(
                        success=True,
                        message=f"Found {len(matches)} matches in {duration:.1f}s",
                        data=matches,
                        duration=duration
                    )
                else:
                    duration = time.time() - start_time
                    return ToolResult(
                        success=True,
                        message=f"No matches found in {duration:.1f}s",
                        data=[],
                        duration=duration
                    )
                    
            except FileNotFoundError:
                # Fallback to basic grep
                result = subprocess.run(
                    ["grep", "-r", "--include=*.ts", "--include=*.tsx", 
                     "--include=*.js", "--include=*.jsx", pattern, "."],
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                duration = time.time() - start_time
                matches = result.stdout.strip().split('\n') if result.stdout.strip() else []
                
                return ToolResult(
                    success=True,
                    message=f"Found {len(matches)} matches in {duration:.1f}s",
                    data=matches,
                    duration=duration
                )
                
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Codebase search failed",
                error=str(e),
                duration=duration
            )

    @staticmethod
    def analyze_dependencies() -> ToolResult:
        """Analyze project dependencies using madge"""
        start_time = time.time()
        print("📊 Analyzing dependencies...")
        
        try:
            # Get main dependencies
            result = subprocess.run([
                "npx", "madge", 
                "--json", 
                "--extensions", "ts,tsx,js,jsx",
                "--exclude", "node_modules|dist|build",
                "."
            ], cwd=ROOT, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                duration = time.time() - start_time
                return ToolResult(
                    success=False,
                    message="Dependency analysis failed",
                    error=result.stderr,
                    duration=duration
                )
            
            dependency_data = json.loads(result.stdout)
            
            # Get circular dependencies
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
                except json.JSONDecodeError:
                    pass
            
            # Combine data
            graph_data = {
                "dependencies": dependency_data,
                "circular_dependencies": circular_deps,
                "generated_at": datetime.now().isoformat(),
                "total_files": len(dependency_data),
                "files_with_deps": len([f for f, deps in dependency_data.items() if deps])
            }
            
            duration = time.time() - start_time
            return ToolResult(
                success=True,
                message=f"Dependency analysis completed: {len(dependency_data)} files analyzed in {duration:.1f}s",
                data=graph_data,
                duration=duration
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Dependency analysis failed",
                error=str(e),
                duration=duration
            )

# Convenience functions that combine multiple tools
def run_full_validation() -> Dict[str, ToolResult]:
    """Run full pre-commit validation using tools including static analysis"""
    print("\n🔒 Running full validation with static analysis using tools...")
    
    results = {}
    
    # Static analysis (ESLint)
    results['eslint'] = BuildTool.run_eslint()
    
    # Code formatting (Prettier)
    results['prettier'] = BuildTool.run_prettier_check()
    
    # TypeScript check
    results['typescript'] = BuildTool.typescript_check()
    
    # Build validation (now includes static analysis)
    results['build'] = BuildTool.build_project()
    
    # Database connection test
    results['database'] = DatabaseTool.test_connection()
    
    # Schema validation
    schema_files = [
        ROOT / "shared" / "schema.ts",
        ROOT / "shared" / "payments-schema.ts", 
        ROOT / "shared" / "grcSchema.ts"
    ]
    results['schema'] = TestTool.validate_schema_files([f for f in schema_files if f.exists()])
    
    # Key files validation
    key_files = [
        ROOT / "server" / "index.ts",
        ROOT / "server" / "routes.ts",
        ROOT / "client" / "src" / "App.tsx",
        ROOT / "client" / "src" / "main.tsx"
    ]
    results['key_files'] = TestTool.validate_schema_files([f for f in key_files if f.exists()])
    
    return results

def commit_with_validation(message: str) -> ToolResult:
    """Commit changes with full validation"""
    print(f"\n📝 Committing with validation: {message}")
    
    # Run full validation first
    validation_results = run_full_validation()
    
    # Check if all validations passed
    failed_checks = [name for name, result in validation_results.items() if not result.success]
    
    if failed_checks:
        return ToolResult(
            success=False,
            message=f"Commit blocked - validation failed: {', '.join(failed_checks)}",
            error=f"Failed validations: {failed_checks}",
            data=validation_results
        )
    
    # If validation passed, commit changes
    return GitTool.commit_changes(message)