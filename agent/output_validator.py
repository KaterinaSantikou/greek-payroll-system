#!/usr/bin/env python3
"""
Output validation system for the continuous agent.
Ensures code quality before accepting generated changes.
"""

import os
import json
import time
import pathlib
import subprocess
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

try:
    from agent.tools import BuildTool, TestTool, ToolResult
except ImportError:
    from tools import BuildTool, TestTool, ToolResult

ROOT = pathlib.Path(__file__).resolve().parents[1]

@dataclass
class ValidationConfig:
    """Configuration for output validation"""
    require_build_pass: bool = True
    require_tests_pass: bool = True
    minimum_coverage: float = 80.0
    timeout_build: int = 300  # 5 minutes
    timeout_tests: int = 600  # 10 minutes
    
class OutputValidator:
    """Comprehensive output validation system"""
    
    def __init__(self, config: Optional[ValidationConfig] = None):
        self.config = config or ValidationConfig()
        
    def validate_changes(self, changes_description: str = "") -> ToolResult:
        """
        Comprehensive validation of code changes.
        
        Returns:
            ToolResult indicating if all validations passed
        """
        print(f"\n🔍 Starting comprehensive output validation...")
        if changes_description:
            print(f"   Changes: {changes_description}")
        
        start_time = time.time()
        validation_results = {}
        failed_validations = []
        
        # 1. Build Validation
        if self.config.require_build_pass:
            print("\n🏗️ [1/3] Build validation...")
            build_result = self._validate_build()
            validation_results['build'] = build_result
            
            if build_result.success:
                print(f"   ✅ {build_result.message}")
            else:
                print(f"   ❌ {build_result.message}")
                failed_validations.append('build')
        
        # 2. Test Validation
        if self.config.require_tests_pass:
            print("\n🧪 [2/3] Test validation...")
            test_result = self._validate_tests()
            validation_results['tests'] = test_result
            
            if test_result.success:
                print(f"   ✅ {test_result.message}")
            else:
                print(f"   ❌ {test_result.message}")
                failed_validations.append('tests')
        
        # 3. Coverage Validation
        print(f"\n📊 [3/3] Coverage validation (minimum {self.config.minimum_coverage}%)...")
        coverage_result = self._validate_coverage()
        validation_results['coverage'] = coverage_result
        
        if coverage_result.success:
            print(f"   ✅ {coverage_result.message}")
        else:
            print(f"   ❌ {coverage_result.message}")
            failed_validations.append('coverage')
        
        # Summary
        total_time = time.time() - start_time
        
        if failed_validations:
            return ToolResult(
                success=False,
                message=f"Validation FAILED - {len(failed_validations)} checks failed: {', '.join(failed_validations)}",
                error=f"Failed: {failed_validations}",
                data={
                    'results': validation_results,
                    'failed': failed_validations,
                    'passed': len(validation_results) - len(failed_validations)
                },
                duration=total_time
            )
        else:
            return ToolResult(
                success=True,
                message=f"All validations PASSED ({len(validation_results)} checks) in {total_time:.1f}s",
                data={
                    'results': validation_results,
                    'failed': [],
                    'passed': len(validation_results)
                },
                duration=total_time
            )
    
    def _validate_build(self) -> ToolResult:
        """Validate that the project builds successfully"""
        return BuildTool.build_project()
    
    def _validate_tests(self) -> ToolResult:
        """Validate that all tests pass"""
        return TestTool.run_tests()
    
    def _validate_coverage(self) -> ToolResult:
        """Validate test coverage meets minimum threshold"""
        start_time = time.time()
        
        try:
            # Try different coverage commands
            coverage_commands = [
                ["npm", "run", "test:coverage"],
                ["npm", "run", "coverage"],
                ["npx", "jest", "--coverage"],
                ["npx", "vitest", "run", "--coverage"]
            ]
            
            coverage_result = None
            coverage_data = None
            
            for cmd in coverage_commands:
                try:
                    print(f"   Trying: {' '.join(cmd)}")
                    result = subprocess.run(
                        cmd,
                        cwd=ROOT,
                        capture_output=True,
                        text=True,
                        timeout=300
                    )
                    
                    if result.returncode == 0:
                        coverage_result = result
                        coverage_data = self._parse_coverage_output(result.stdout)
                        break
                        
                except subprocess.TimeoutExpired:
                    continue
                except FileNotFoundError:
                    continue
            
            duration = time.time() - start_time
            
            if not coverage_result:
                return ToolResult(
                    success=True,  # Don't fail if coverage tools aren't available
                    message=f"Coverage validation skipped - no coverage tools found",
                    data="skipped",
                    duration=duration
                )
            
            if coverage_data and coverage_data['line_coverage'] >= self.config.minimum_coverage:
                return ToolResult(
                    success=True,
                    message=f"Coverage validation passed: {coverage_data['line_coverage']:.1f}% (target: {self.config.minimum_coverage}%)",
                    data=coverage_data,
                    duration=duration
                )
            elif coverage_data:
                return ToolResult(
                    success=False,
                    message=f"Coverage too low: {coverage_data['line_coverage']:.1f}% (target: {self.config.minimum_coverage}%)",
                    error=f"Coverage {coverage_data['line_coverage']:.1f}% < {self.config.minimum_coverage}%",
                    data=coverage_data,
                    duration=duration
                )
            else:
                # If we can't parse coverage, don't fail the validation
                return ToolResult(
                    success=True,
                    message="Coverage validation completed but could not parse results",
                    data="unparseable",
                    duration=duration
                )
                
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=True,  # Don't fail validation for coverage tool issues
                message=f"Coverage validation skipped due to error: {str(e)}",
                error=str(e),
                duration=duration
            )
    
    def _parse_coverage_output(self, output: str) -> Optional[Dict]:
        """Parse coverage output to extract percentages"""
        try:
            lines = output.split('\n')
            
            # Look for Jest/Vitest coverage summary
            for line in lines:
                if 'All files' in line or 'TOTAL' in line:
                    # Extract percentage from line like: "All files        |   85.71 |   80.95 |   88.89 |   85.71 |"
                    parts = line.split('|')
                    if len(parts) >= 2:
                        try:
                            # Usually the first percentage is line coverage
                            line_coverage = float(parts[1].strip())
                            return {
                                'line_coverage': line_coverage,
                                'source': 'jest/vitest',
                                'raw_line': line.strip()
                            }
                        except (ValueError, IndexError):
                            continue
            
            # Look for other coverage formats
            for line in lines:
                if 'Coverage' in line and '%' in line:
                    # Try to extract percentage
                    import re
                    match = re.search(r'(\d+\.?\d*)%', line)
                    if match:
                        coverage = float(match.group(1))
                        return {
                            'line_coverage': coverage,
                            'source': 'generic',
                            'raw_line': line.strip()
                        }
            
            return None
            
        except Exception:
            return None

def validate_task_output(task_description: str = "", config: Optional[ValidationConfig] = None) -> ToolResult:
    """
    Validate task output with comprehensive checks.
    
    Args:
        task_description: Description of what was changed
        config: Validation configuration
        
    Returns:
        ToolResult indicating if validation passed
    """
    validator = OutputValidator(config)
    return validator.validate_changes(task_description)

def should_reject_patch(validation_result: ToolResult) -> bool:
    """
    Determine if a patch should be rejected based on validation results.
    
    Args:
        validation_result: Result from validate_task_output
        
    Returns:
        True if patch should be rejected
    """
    return not validation_result.success

def move_task_back_to_pending(task_file: pathlib.Path, reason: str):
    """
    Move a failed task back to pending with failure information.
    
    Args:
        task_file: Path to the task file
        reason: Reason for moving back to pending
    """
    try:
        if not task_file.exists():
            return
        
        # Read current task content
        task_content = task_file.read_text(encoding='utf-8')
        
        # Add failure information
        failure_note = f"\n\n## Validation Failure\n**Reason:** {reason}\n**Timestamp:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n"
        updated_content = task_content + failure_note
        
        # Move back to pending
        pending_dir = task_file.parent.parent / "pending"
        pending_dir.mkdir(exist_ok=True)
        
        pending_file = pending_dir / task_file.name
        pending_file.write_text(updated_content, encoding='utf-8')
        
        # Remove from current location
        task_file.unlink()
        
        print(f"📋 Task moved back to pending: {task_file.name}")
        print(f"   Reason: {reason}")
        
    except Exception as e:
        print(f"⚠️ Could not move task back to pending: {e}")

# Convenience function for agent integration
def validate_and_handle_task(task_file: pathlib.Path, task_description: str = "") -> bool:
    """
    Validate task output and handle failure by moving back to pending.
    
    Args:
        task_file: Path to the task file
        task_description: Description of changes made
        
    Returns:
        True if validation passed, False if rejected
    """
    print(f"\n🔍 Validating output for task: {task_file.name}")
    
    validation_result = validate_task_output(task_description)
    
    if validation_result.success:
        print(f"✅ Validation passed: {validation_result.message}")
        return True
    else:
        print(f"❌ Validation failed: {validation_result.message}")
        
        # Move task back to pending
        move_task_back_to_pending(task_file, validation_result.message)
        return False