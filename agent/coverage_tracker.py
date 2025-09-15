#!/usr/bin/env python3
"""
Coverage tracking system that ensures test coverage does not drop between commits.
Enforces coverage-driven testing by blocking commits that reduce coverage percentage.
"""

import json
import pathlib
import subprocess
import time
from typing import Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

# Import tool result for consistency
try:
    from agent.tools import ToolResult, ROOT, safe_log_subprocess_output
except ImportError:
    from tools import ToolResult, ROOT, safe_log_subprocess_output

@dataclass
class CoverageReport:
    """Coverage metrics for a specific commit"""
    commit_hash: str
    timestamp: str
    total_lines: int
    covered_lines: int
    total_functions: int
    covered_functions: int
    total_branches: int
    covered_branches: int
    total_statements: int
    covered_statements: int
    line_coverage: float
    function_coverage: float
    branch_coverage: float
    statement_coverage: float
    
    @property
    def overall_coverage(self) -> float:
        """Calculate overall coverage as average of all metrics"""
        return (self.line_coverage + self.function_coverage + 
                self.branch_coverage + self.statement_coverage) / 4

class CoverageTracker:
    """Tracks and enforces test coverage requirements"""
    
    def __init__(self):
        self.coverage_dir = ROOT / "coverage"
        self.history_file = ROOT / "agent" / "coverage_history.json"
        self.ensure_directories()
    
    def ensure_directories(self):
        """Ensure required directories exist"""
        self.coverage_dir.mkdir(exist_ok=True)
        (ROOT / "agent").mkdir(exist_ok=True)
    
    def run_tests_with_coverage(self) -> ToolResult:
        """Run Jest tests with coverage collection"""
        start_time = time.time()
        print("🧪 Running Jest tests with coverage collection...")
        
        try:
            # Run Jest with coverage
            result = subprocess.run(
                ["npx", "jest", "--coverage", "--passWithNoTests"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            duration = time.time() - start_time
            
            if result.returncode == 0:
                return ToolResult(
                    success=True,
                    message=f"Tests passed with coverage in {duration:.1f}s",
                    duration=duration
                )
            else:
                safe_log_subprocess_output(result, "Jest coverage")
                return ToolResult(
                    success=False,
                    message="Tests failed or coverage insufficient",
                    error=result.stdout + "\n" + result.stderr,
                    duration=duration
                )
                
        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Test coverage collection timed out",
                error="Jest process exceeded timeout",
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Coverage collection error",
                error=str(e),
                duration=duration
            )
    
    def parse_coverage_report(self) -> Optional[CoverageReport]:
        """Parse Jest coverage report from JSON"""
        coverage_json = self.coverage_dir / "coverage-final.json"
        
        if not coverage_json.exists():
            print(f"❌ Coverage report not found: {coverage_json}")
            return None
        
        try:
            with open(coverage_json, 'r') as f:
                coverage_data = json.load(f)
            
            # Aggregate coverage metrics across all files
            total_lines = sum(file_data.get('l', {}).get('total', 0) for file_data in coverage_data.values())
            covered_lines = sum(file_data.get('l', {}).get('covered', 0) for file_data in coverage_data.values())
            total_functions = sum(file_data.get('f', {}).get('total', 0) for file_data in coverage_data.values())
            covered_functions = sum(file_data.get('f', {}).get('covered', 0) for file_data in coverage_data.values())
            total_branches = sum(file_data.get('b', {}).get('total', 0) for file_data in coverage_data.values())
            covered_branches = sum(file_data.get('b', {}).get('covered', 0) for file_data in coverage_data.values())
            total_statements = sum(file_data.get('s', {}).get('total', 0) for file_data in coverage_data.values())
            covered_statements = sum(file_data.get('s', {}).get('covered', 0) for file_data in coverage_data.values())
            
            # Calculate percentages
            line_coverage = (covered_lines / total_lines * 100) if total_lines > 0 else 0
            function_coverage = (covered_functions / total_functions * 100) if total_functions > 0 else 0
            branch_coverage = (covered_branches / total_branches * 100) if total_branches > 0 else 0
            statement_coverage = (covered_statements / total_statements * 100) if total_statements > 0 else 0
            
            # Get current commit hash
            try:
                commit_result = subprocess.run(
                    ["git", "rev-parse", "HEAD"],
                    cwd=ROOT,
                    capture_output=True,
                    text=True
                )
                commit_hash = commit_result.stdout.strip() if commit_result.returncode == 0 else "unknown"
            except:
                commit_hash = "unknown"
            
            return CoverageReport(
                commit_hash=commit_hash,
                timestamp=datetime.now().isoformat(),
                total_lines=total_lines,
                covered_lines=covered_lines,
                total_functions=total_functions,
                covered_functions=covered_functions,
                total_branches=total_branches,
                covered_branches=covered_branches,
                total_statements=total_statements,
                covered_statements=covered_statements,
                line_coverage=line_coverage,
                function_coverage=function_coverage,
                branch_coverage=branch_coverage,
                statement_coverage=statement_coverage
            )
            
        except Exception as e:
            print(f"❌ Error parsing coverage report: {e}")
            return None
    
    def load_coverage_history(self) -> Dict[str, CoverageReport]:
        """Load coverage history from file"""
        if not self.history_file.exists():
            return {}
        
        try:
            with open(self.history_file, 'r') as f:
                history_data = json.load(f)
            
            history = {}
            for commit_hash, data in history_data.items():
                history[commit_hash] = CoverageReport(**data)
            
            return history
        except Exception as e:
            print(f"⚠️ Error loading coverage history: {e}")
            return {}
    
    def save_coverage_history(self, history: Dict[str, CoverageReport]):
        """Save coverage history to file"""
        try:
            history_data = {}
            for commit_hash, report in history.items():
                history_data[commit_hash] = {
                    'commit_hash': report.commit_hash,
                    'timestamp': report.timestamp,
                    'total_lines': report.total_lines,
                    'covered_lines': report.covered_lines,
                    'total_functions': report.total_functions,
                    'covered_functions': report.covered_functions,
                    'total_branches': report.total_branches,
                    'covered_branches': report.covered_branches,
                    'total_statements': report.total_statements,
                    'covered_statements': report.covered_statements,
                    'line_coverage': report.line_coverage,
                    'function_coverage': report.function_coverage,
                    'branch_coverage': report.branch_coverage,
                    'statement_coverage': report.statement_coverage
                }
            
            with open(self.history_file, 'w') as f:
                json.dump(history_data, f, indent=2)
                
        except Exception as e:
            print(f"❌ Error saving coverage history: {e}")
    
    def get_baseline_coverage(self) -> Optional[CoverageReport]:
        """Get the most recent coverage report for comparison"""
        history = self.load_coverage_history()
        
        if not history:
            return None
        
        # Return the most recent coverage report
        sorted_reports = sorted(history.values(), key=lambda r: r.timestamp, reverse=True)
        return sorted_reports[0] if sorted_reports else None
    
    def check_coverage_regression(self, current_report: CoverageReport) -> Tuple[bool, str]:
        """Check if coverage has regressed compared to baseline"""
        baseline = self.get_baseline_coverage()
        
        if not baseline:
            print("📊 No baseline coverage found - establishing baseline")
            return True, "Baseline coverage established"
        
        # Check if coverage has dropped
        coverage_drop = baseline.overall_coverage - current_report.overall_coverage
        
        if coverage_drop > 0.5:  # Allow 0.5% tolerance for rounding
            return False, f"Coverage regression detected: {baseline.overall_coverage:.2f}% → {current_report.overall_coverage:.2f}% (drop: {coverage_drop:.2f}%)"
        
        if coverage_drop > 0:
            return True, f"Minor coverage change: {baseline.overall_coverage:.2f}% → {current_report.overall_coverage:.2f}% (within tolerance)"
        
        return True, f"Coverage maintained or improved: {baseline.overall_coverage:.2f}% → {current_report.overall_coverage:.2f}%"
    
    def validate_coverage_requirements(self) -> ToolResult:
        """Run tests with coverage and validate against requirements"""
        start_time = time.time()
        
        # Run tests with coverage
        test_result = self.run_tests_with_coverage()
        if not test_result.success:
            return test_result
        
        # Parse coverage report
        current_report = self.parse_coverage_report()
        if not current_report:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Failed to parse coverage report",
                error="Coverage data unavailable",
                duration=duration
            )
        
        # Check for coverage regression
        regression_ok, regression_msg = self.check_coverage_regression(current_report)
        
        # Update coverage history
        history = self.load_coverage_history()
        history[current_report.commit_hash] = current_report
        self.save_coverage_history(history)
        
        duration = time.time() - start_time
        
        # Generate detailed report
        coverage_summary = (
            f"📊 Coverage Report:\n"
            f"   Lines: {current_report.line_coverage:.2f}% ({current_report.covered_lines}/{current_report.total_lines})\n"
            f"   Functions: {current_report.function_coverage:.2f}% ({current_report.covered_functions}/{current_report.total_functions})\n" 
            f"   Branches: {current_report.branch_coverage:.2f}% ({current_report.covered_branches}/{current_report.total_branches})\n"
            f"   Statements: {current_report.statement_coverage:.2f}% ({current_report.covered_statements}/{current_report.total_statements})\n"
            f"   Overall: {current_report.overall_coverage:.2f}%\n"
            f"   {regression_msg}"
        )
        
        if regression_ok:
            return ToolResult(
                success=True,
                message=f"Coverage validation passed in {duration:.1f}s",
                data=coverage_summary,
                duration=duration
            )
        else:
            return ToolResult(
                success=False,
                message="Coverage regression detected - commit blocked",
                error=regression_msg + "\n" + coverage_summary,
                duration=duration
            )

# Convenience functions for integration with existing tools
def run_coverage_validation() -> ToolResult:
    """Run coverage validation - convenience function for tools integration"""
    tracker = CoverageTracker()
    return tracker.validate_coverage_requirements()

def get_current_coverage_report() -> Optional[CoverageReport]:
    """Get current coverage report - convenience function"""
    tracker = CoverageTracker()
    test_result = tracker.run_tests_with_coverage()
    if test_result.success:
        return tracker.parse_coverage_report()
    return None