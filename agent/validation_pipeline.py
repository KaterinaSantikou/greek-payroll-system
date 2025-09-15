#!/usr/bin/env python3
"""
Agent Validation Pipeline

Validates all code changes before commit by running build and test suite.
Automatically discards commits that fail validation to prevent broken code.
"""

import subprocess
import sys
import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ValidationResult:
    """Represents the result of a validation step"""
    def __init__(self, success: bool, output: str, error: str = "", duration: float = 0):
        self.success = success
        self.output = output
        self.error = error
        self.duration = duration

class ValidationPipeline:
    """Main validation pipeline for agent code changes"""
    
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.validation_log = self.project_root / "agent" / "validation_log.json"
        
    def run_command(self, command: List[str], timeout: int = 300) -> ValidationResult:
        """Run a shell command and capture output"""
        start_time = datetime.now()
        
        try:
            logger.info(f"Running: {' '.join(command)}")
            result = subprocess.run(
                command,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            duration = (datetime.now() - start_time).total_seconds()
            
            return ValidationResult(
                success=result.returncode == 0,
                output=result.stdout,
                error=result.stderr,
                duration=duration
            )
            
        except subprocess.TimeoutExpired:
            duration = (datetime.now() - start_time).total_seconds()
            return ValidationResult(
                success=False,
                output="",
                error=f"Command timed out after {timeout} seconds",
                duration=duration
            )
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            return ValidationResult(
                success=False,
                output="",
                error=f"Command failed: {str(e)}",
                duration=duration
            )

    def validate_build(self) -> ValidationResult:
        """Validate TypeScript compilation"""
        logger.info("🔨 Running build validation...")
        return self.run_command(["npm", "run", "build"])

    def validate_tests(self) -> ValidationResult:
        """Validate test suite execution"""
        logger.info("🧪 Running test validation...")
        return self.run_command(["npm", "test", "--", "--passWithNoTests"])

    def validate_linting(self) -> ValidationResult:
        """Validate ESLint rules"""
        logger.info("🔍 Running linting validation...")
        return self.run_command(["npm", "run", "lint"])

    def validate_type_check(self) -> ValidationResult:
        """Validate TypeScript type checking"""
        logger.info("📝 Running type check validation...")
        return self.run_command(["npm", "run", "check"])

    def check_test_coverage(self) -> ValidationResult:
        """Check that test coverage meets requirements"""
        logger.info("📊 Checking test coverage...")
        result = self.run_command(["npm", "run", "test:coverage"])
        
        if result.success:
            # Parse coverage output to check if it meets 80% threshold
            coverage_lines = result.output.split('\n')
            coverage_summary = [line for line in coverage_lines if 'All files' in line or 'Statements' in line or 'Branches' in line or 'Functions' in line or 'Lines' in line]
            
            # Look for coverage percentages
            failed_coverage = []
            for line in coverage_summary:
                if any(metric in line for metric in ['Statements', 'Branches', 'Functions', 'Lines']):
                    # Extract percentage (assuming format like "Lines: 85.5%")
                    parts = line.split()
                    for i, part in enumerate(parts):
                        if '%' in part and i > 0:
                            try:
                                percentage = float(part.replace('%', ''))
                                if percentage < 80:
                                    metric_name = parts[i-1].rstrip(':')
                                    failed_coverage.append(f"{metric_name}: {percentage}%")
                            except ValueError:
                                continue
            
            if failed_coverage:
                return ValidationResult(
                    success=False,
                    output=result.output,
                    error=f"Coverage below 80% threshold: {', '.join(failed_coverage)}",
                    duration=result.duration
                )
        
        return result

    def validate_security(self) -> ValidationResult:
        """Run security validation checks"""
        logger.info("🔒 Running security validation...")
        
        # Check for hardcoded secrets
        secret_patterns = [
            "sk-[a-zA-Z0-9]{48}",  # OpenAI API keys
            "ghp_[a-zA-Z0-9]{36}",  # GitHub tokens
            "SG\\.[a-zA-Z0-9_-]{69}",  # SendGrid API keys
            "xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}",  # Slack bot tokens
        ]
        
        for pattern in secret_patterns:
            result = self.run_command(["grep", "-r", "-E", pattern, "server/", "shared/", "tests/"])
            if result.success and result.output.strip():
                return ValidationResult(
                    success=False,
                    output="",
                    error=f"Potential hardcoded secrets detected: {result.output[:200]}...",
                    duration=0
                )
        
        return ValidationResult(success=True, output="Security validation passed", error="")

    def validate_file_permissions(self, changed_files: List[str]) -> ValidationResult:
        """Validate that only allowed files were modified"""
        logger.info("📁 Validating file permissions...")
        
        try:
            with open(self.project_root / "agent" / "allowed_paths.json", 'r') as f:
                allowed_config = json.load(f)
            
            allowed_patterns = allowed_config.get("allowed_patterns", [])
            forbidden_patterns = allowed_config.get("forbidden_patterns", [])
            
            violations = []
            
            for file_path in changed_files:
                # Check if file matches any forbidden pattern
                for forbidden in forbidden_patterns:
                    if self._matches_pattern(file_path, forbidden):
                        violations.append(f"Forbidden file modified: {file_path}")
                        break
                else:
                    # Check if file matches any allowed pattern
                    allowed = False
                    for pattern in allowed_patterns:
                        if self._matches_pattern(file_path, pattern):
                            allowed = True
                            break
                    
                    if not allowed:
                        violations.append(f"File not in allowed patterns: {file_path}")
            
            if violations:
                return ValidationResult(
                    success=False,
                    output="",
                    error=f"File permission violations: {'; '.join(violations)}"
                )
            
            return ValidationResult(success=True, output="File permissions validated", error="")
            
        except Exception as e:
            return ValidationResult(
                success=False,
                output="",
                error=f"Failed to validate file permissions: {str(e)}"
            )

    def _matches_pattern(self, file_path: str, pattern: str) -> bool:
        """Check if a file path matches a glob pattern"""
        import fnmatch
        return fnmatch.fnmatch(file_path, pattern)

    def get_changed_files(self) -> List[str]:
        """Get list of files changed in current working directory"""
        try:
            # Get staged files
            result = self.run_command(["git", "diff", "--cached", "--name-only"])
            if result.success:
                staged_files = [f.strip() for f in result.output.split('\n') if f.strip()]
                
                # Get unstaged files
                result = self.run_command(["git", "diff", "--name-only"])
                if result.success:
                    unstaged_files = [f.strip() for f in result.output.split('\n') if f.strip()]
                    
                    # Combine and deduplicate
                    all_files = list(set(staged_files + unstaged_files))
                    return [f for f in all_files if f and os.path.exists(os.path.join(self.project_root, f))]
            
            return []
        except Exception as e:
            logger.warning(f"Could not get changed files: {e}")
            return []

    def run_full_validation(self, skip_coverage: bool = False) -> Dict[str, ValidationResult]:
        """Run complete validation pipeline"""
        logger.info("🚀 Starting validation pipeline...")
        
        results = {}
        
        # Get changed files for permission checking
        changed_files = self.get_changed_files()
        if changed_files:
            logger.info(f"Validating {len(changed_files)} changed files: {', '.join(changed_files[:5])}{'...' if len(changed_files) > 5 else ''}")
            results['file_permissions'] = self.validate_file_permissions(changed_files)
        
        # Run validations in order of importance
        validations = [
            ('security', self.validate_security),
            ('type_check', self.validate_type_check),
            ('linting', self.validate_linting),
            ('build', self.validate_build),
            ('tests', self.validate_tests),
        ]
        
        if not skip_coverage:
            validations.append(('coverage', self.check_test_coverage))
        
        for name, validation_func in validations:
            try:
                results[name] = validation_func()
                
                if not results[name].success:
                    logger.error(f"❌ {name.title()} validation failed")
                    logger.error(f"Error: {results[name].error}")
                    if results[name].output:
                        logger.error(f"Output: {results[name].output[:500]}...")
                else:
                    logger.info(f"✅ {name.title()} validation passed ({results[name].duration:.2f}s)")
                    
            except Exception as e:
                logger.error(f"❌ {name.title()} validation crashed: {e}")
                results[name] = ValidationResult(
                    success=False,
                    output="",
                    error=f"Validation crashed: {str(e)}"
                )
        
        return results

    def log_validation_results(self, results: Dict[str, ValidationResult]) -> None:
        """Log validation results to file"""
        try:
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "results": {
                    name: {
                        "success": result.success,
                        "error": result.error,
                        "duration": result.duration,
                        "output_length": len(result.output)
                    }
                    for name, result in results.items()
                }
            }
            
            # Read existing log
            existing_log = []
            if self.validation_log.exists():
                with open(self.validation_log, 'r') as f:
                    existing_log = json.load(f)
            
            # Append new entry and keep last 100 entries
            existing_log.append(log_entry)
            existing_log = existing_log[-100:]
            
            # Write back to file
            with open(self.validation_log, 'w') as f:
                json.dump(existing_log, f, indent=2)
                
        except Exception as e:
            logger.warning(f"Failed to log validation results: {e}")

    def should_discard_commit(self, results: Dict[str, ValidationResult]) -> Tuple[bool, str]:
        """Determine if commit should be discarded based on validation results"""
        failed_validations = [name for name, result in results.items() if not result.success]
        
        if not failed_validations:
            return False, "All validations passed"
        
        # Critical failures that should always discard
        critical_failures = ['build', 'security', 'file_permissions']
        critical_failed = [name for name in failed_validations if name in critical_failures]
        
        if critical_failed:
            return True, f"Critical validations failed: {', '.join(critical_failed)}"
        
        # Check if too many validations failed
        if len(failed_validations) >= 3:
            return True, f"Too many validations failed: {', '.join(failed_validations)}"
        
        # Test failures should discard unless explicitly overridden
        if 'tests' in failed_validations:
            return True, "Test suite failed"
        
        # Coverage failures are warnings but don't discard
        non_coverage_failures = [name for name in failed_validations if name not in ['coverage', 'linting']]
        if non_coverage_failures:
            return True, f"Validations failed: {', '.join(non_coverage_failures)}"
        
        return False, f"Minor validations failed (warnings): {', '.join(failed_validations)}"

def main():
    """Main entry point for validation pipeline"""
    pipeline = ValidationPipeline()
    
    try:
        # Run full validation
        results = pipeline.run_full_validation()
        
        # Log results
        pipeline.log_validation_results(results)
        
        # Determine if commit should be discarded
        should_discard, reason = pipeline.should_discard_commit(results)
        
        # Print summary
        total_validations = len(results)
        successful_validations = sum(1 for result in results.values() if result.success)
        
        print("\n" + "="*60)
        print("🔍 VALIDATION PIPELINE RESULTS")
        print("="*60)
        print(f"Total validations: {total_validations}")
        print(f"Successful: {successful_validations}")
        print(f"Failed: {total_validations - successful_validations}")
        print(f"Decision: {'DISCARD COMMIT' if should_discard else 'ALLOW COMMIT'}")
        print(f"Reason: {reason}")
        print("="*60)
        
        for name, result in results.items():
            status = "✅ PASS" if result.success else "❌ FAIL"
            duration = f"({result.duration:.2f}s)" if result.duration > 0 else ""
            print(f"{status} {name.title().replace('_', ' ')} {duration}")
            
            if not result.success and result.error:
                print(f"    Error: {result.error[:100]}{'...' if len(result.error) > 100 else ''}")
        
        print("="*60)
        
        if should_discard:
            logger.error("❌ VALIDATION FAILED - COMMIT WILL BE DISCARDED")
            sys.exit(1)
        else:
            logger.info("✅ VALIDATION PASSED - COMMIT ALLOWED")
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"❌ Validation pipeline crashed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()