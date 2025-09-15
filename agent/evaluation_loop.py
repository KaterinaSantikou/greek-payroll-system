#!/usr/bin/env python3
"""
Evaluation loop system for the continuous agent.
Tracks performance metrics and provides self-evaluation to prevent degradation.
"""

import os
import csv
import time
import json
import pathlib
import subprocess
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

try:
    from agent.tools import GitTool, TestTool, ToolResult
except ImportError:
    from tools import GitTool, TestTool, ToolResult

ROOT = pathlib.Path(__file__).resolve().parents[1]
HISTORY_CSV = ROOT / "agent" / "history.csv"

@dataclass
class TaskMetrics:
    """Metrics for a completed task"""
    task_name: str
    files_changed: List[str]
    tests_passed: bool
    commit_hash: str
    run_time: float
    timestamp: str
    success: bool
    validation_passed: bool
    lines_added: int
    lines_removed: int
    test_count: int
    coverage_percentage: Optional[float] = None
    
class PerformanceTracker:
    """Tracks agent performance over time"""
    
    def __init__(self):
        self.history_file = HISTORY_CSV
        self._ensure_history_file()
    
    def _ensure_history_file(self):
        """Ensure the history CSV file exists with proper headers"""
        if not self.history_file.exists():
            self.history_file.parent.mkdir(parents=True, exist_ok=True)
            
            headers = [
                'task_name', 'files_changed', 'tests_passed', 'commit_hash', 
                'run_time', 'timestamp', 'success', 'validation_passed',
                'lines_added', 'lines_removed', 'test_count', 'coverage_percentage'
            ]
            
            with open(self.history_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(headers)
    
    def log_task_completion(self, metrics: TaskMetrics):
        """Log task completion metrics to CSV"""
        try:
            with open(self.history_file, 'a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                
                # Convert files_changed list to comma-separated string
                files_str = ';'.join(metrics.files_changed) if metrics.files_changed else ''
                
                row = [
                    metrics.task_name,
                    files_str,
                    metrics.tests_passed,
                    metrics.commit_hash,
                    f"{metrics.run_time:.2f}",
                    metrics.timestamp,
                    metrics.success,
                    metrics.validation_passed,
                    metrics.lines_added,
                    metrics.lines_removed,
                    metrics.test_count,
                    f"{metrics.coverage_percentage:.1f}" if metrics.coverage_percentage else ""
                ]
                
                writer.writerow(row)
                
            print(f"📊 Logged task metrics: {metrics.task_name}")
            
        except Exception as e:
            print(f"⚠️ Could not log task metrics: {e}")
    
    def get_recent_performance(self, last_n_tasks: int = 10) -> List[Dict]:
        """Get performance data for the last N tasks"""
        try:
            if not self.history_file.exists():
                return []
            
            with open(self.history_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                tasks = list(reader)
                
            # Return last N tasks
            return tasks[-last_n_tasks:] if tasks else []
            
        except Exception as e:
            print(f"⚠️ Could not read performance history: {e}")
            return []
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get overall performance summary"""
        recent_tasks = self.get_recent_performance(20)
        
        if not recent_tasks:
            return {"message": "No performance data available"}
        
        total_tasks = len(recent_tasks)
        successful_tasks = sum(1 for task in recent_tasks if task.get('success') == 'True')
        validation_passed = sum(1 for task in recent_tasks if task.get('validation_passed') == 'True')
        tests_passed = sum(1 for task in recent_tasks if task.get('tests_passed') == 'True')
        
        avg_runtime = 0
        if recent_tasks:
            runtimes = [float(task.get('run_time', 0)) for task in recent_tasks if task.get('run_time')]
            avg_runtime = sum(runtimes) / len(runtimes) if runtimes else 0
        
        return {
            "total_tasks": total_tasks,
            "success_rate": f"{(successful_tasks / total_tasks * 100):.1f}%" if total_tasks > 0 else "0%",
            "validation_pass_rate": f"{(validation_passed / total_tasks * 100):.1f}%" if total_tasks > 0 else "0%",
            "test_pass_rate": f"{(tests_passed / total_tasks * 100):.1f}%" if total_tasks > 0 else "0%",
            "avg_runtime": f"{avg_runtime:.1f}s",
            "recent_tasks": total_tasks
        }

class AgentCritic:
    """Self-evaluation system for agent performance"""
    
    def __init__(self, performance_tracker: PerformanceTracker):
        self.tracker = performance_tracker
        self.critic_reports_dir = ROOT / "agent" / "critic_reports"
        self.critic_reports_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_critic_report(self, task_name: str, changed_files: List[str], 
                             task_summary: str, metrics: TaskMetrics) -> str:
        """Generate a self-critical evaluation report"""
        
        # Get performance context
        performance_summary = self.tracker.get_performance_summary()
        recent_tasks = self.tracker.get_recent_performance(5)
        
        # Generate timestamp for report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"critic_report_{task_name}_{timestamp}.md"
        report_path = self.critic_reports_dir / report_filename
        
        # Analyze git diff for changes
        diff_analysis = self._analyze_git_diff()
        
        # Generate critic content
        critic_content = self._generate_critic_content(
            task_name, changed_files, task_summary, metrics,
            performance_summary, recent_tasks, diff_analysis
        )
        
        try:
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(critic_content)
            
            print(f"📝 Generated critic report: {report_filename}")
            return str(report_path)
            
        except Exception as e:
            print(f"⚠️ Could not write critic report: {e}")
            return ""
    
    def _analyze_git_diff(self) -> Dict[str, Any]:
        """Analyze recent git changes for quality assessment"""
        try:
            # Get git diff stats
            result = subprocess.run(
                ["git", "diff", "--stat", "HEAD~1", "HEAD"],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=ROOT
            )
            
            diff_stats = result.stdout if result.returncode == 0 else ""
            
            # Get actual diff for code quality analysis
            result = subprocess.run(
                ["git", "diff", "HEAD~1", "HEAD"],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=ROOT
            )
            
            diff_content = result.stdout if result.returncode == 0 else ""
            
            # Basic analysis
            lines_added = diff_content.count('\n+') if diff_content else 0
            lines_removed = diff_content.count('\n-') if diff_content else 0
            files_changed = len([line for line in diff_stats.split('\n') if ' | ' in line])
            
            return {
                "lines_added": lines_added,
                "lines_removed": lines_removed,
                "files_changed": files_changed,
                "diff_stats": diff_stats,
                "has_tests": "test" in diff_content.lower() or "spec" in diff_content.lower(),
                "has_documentation": "README" in diff_content or "md" in diff_content
            }
            
        except Exception as e:
            print(f"⚠️ Could not analyze git diff: {e}")
            return {"error": str(e)}
    
    def _generate_critic_content(self, task_name: str, changed_files: List[str],
                               task_summary: str, metrics: TaskMetrics,
                               performance_summary: Dict, recent_tasks: List[Dict],
                               diff_analysis: Dict) -> str:
        """Generate the actual critic report content"""
        
        content = f"""# Agent Performance Critic Report

**Task:** {task_name}
**Timestamp:** {metrics.timestamp}
**Duration:** {metrics.run_time:.2f}s

## Task Summary
{task_summary}

## Performance Metrics

### Current Task Results
- **Success:** {'✅ Yes' if metrics.success else '❌ No'}
- **Validation Passed:** {'✅ Yes' if metrics.validation_passed else '❌ No'}
- **Tests Passed:** {'✅ Yes' if metrics.tests_passed else '❌ No'}
- **Files Changed:** {len(changed_files)}
- **Lines Added:** {metrics.lines_added}
- **Lines Removed:** {metrics.lines_removed}
- **Test Count:** {metrics.test_count}
- **Coverage:** {metrics.coverage_percentage:.1f}% if metrics.coverage_percentage else 'N/A'}

### Files Modified
{chr(10).join(f"- `{file}`" for file in changed_files) if changed_files else "- No files changed"}

### Overall Performance Trends
- **Recent Success Rate:** {performance_summary.get('success_rate', 'N/A')}
- **Validation Pass Rate:** {performance_summary.get('validation_pass_rate', 'N/A')}
- **Test Pass Rate:** {performance_summary.get('test_pass_rate', 'N/A')}
- **Average Runtime:** {performance_summary.get('avg_runtime', 'N/A')}

## Code Quality Analysis

### Git Diff Analysis
- **Lines Added:** {diff_analysis.get('lines_added', 0)}
- **Lines Removed:** {diff_analysis.get('lines_removed', 0)}
- **Files Changed:** {diff_analysis.get('files_changed', 0)}
- **Includes Tests:** {'✅ Yes' if diff_analysis.get('has_tests') else '❌ No'}
- **Includes Documentation:** {'✅ Yes' if diff_analysis.get('has_documentation') else '❌ No'}

## Self-Critical Evaluation

### Strengths Demonstrated
{self._evaluate_strengths(metrics, performance_summary, diff_analysis)}

### Areas for Improvement
{self._evaluate_weaknesses(metrics, performance_summary, diff_analysis)}

### Risk Assessment
{self._assess_risks(metrics, recent_tasks)}

## Recommendations for Future Tasks

### Process Improvements
{self._generate_process_recommendations(metrics, performance_summary)}

### Technical Improvements
{self._generate_technical_recommendations(diff_analysis, metrics)}

## Performance Trend Analysis

### Recent Task Comparison
{self._compare_recent_performance(recent_tasks, metrics)}

---
*This report was generated automatically by the Agent Critic system*
*Report ID: {task_name}_{metrics.timestamp}*
"""
        return content
    
    def _evaluate_strengths(self, metrics: TaskMetrics, performance_summary: Dict, diff_analysis: Dict) -> str:
        """Evaluate what went well"""
        strengths = []
        
        if metrics.success:
            strengths.append("- ✅ Task completed successfully")
        
        if metrics.validation_passed:
            strengths.append("- ✅ All validation checks passed (build, tests, coverage)")
            
        if metrics.tests_passed:
            strengths.append("- ✅ All tests are passing")
            
        if diff_analysis.get('has_tests'):
            strengths.append("- ✅ Included test coverage in changes")
            
        if metrics.run_time < 300:  # Under 5 minutes
            strengths.append("- ✅ Efficient task completion time")
            
        if metrics.coverage_percentage and metrics.coverage_percentage >= 80:
            strengths.append(f"- ✅ Excellent test coverage ({metrics.coverage_percentage:.1f}%)")
            
        return '\n'.join(strengths) if strengths else "- No notable strengths identified"
    
    def _evaluate_weaknesses(self, metrics: TaskMetrics, performance_summary: Dict, diff_analysis: Dict) -> str:
        """Evaluate what needs improvement"""
        weaknesses = []
        
        if not metrics.success:
            weaknesses.append("- ❌ Task failed to complete successfully")
            
        if not metrics.validation_passed:
            weaknesses.append("- ❌ Failed validation checks - code quality issues")
            
        if not metrics.tests_passed:
            weaknesses.append("- ❌ Test failures indicate functionality issues")
            
        if not diff_analysis.get('has_tests'):
            weaknesses.append("- ⚠️ No test coverage added for new functionality")
            
        if metrics.run_time > 600:  # Over 10 minutes
            weaknesses.append("- ⚠️ Task took longer than expected to complete")
            
        if metrics.coverage_percentage and metrics.coverage_percentage < 80:
            weaknesses.append(f"- ⚠️ Test coverage below target ({metrics.coverage_percentage:.1f}% < 80%)")
            
        # Check for large diffs without tests
        if diff_analysis.get('lines_added', 0) > 100 and not diff_analysis.get('has_tests'):
            weaknesses.append("- ⚠️ Large code changes without corresponding test additions")
            
        return '\n'.join(weaknesses) if weaknesses else "- No significant weaknesses identified"
    
    def _assess_risks(self, metrics: TaskMetrics, recent_tasks: List[Dict]) -> str:
        """Assess potential risks based on recent performance"""
        risks = []
        
        if len(recent_tasks) >= 3:
            recent_failures = sum(1 for task in recent_tasks[-3:] if task.get('success') != 'True')
            if recent_failures >= 2:
                risks.append("- 🚨 HIGH RISK: Multiple recent task failures indicate systemic issues")
        
        if not metrics.validation_passed:
            risks.append("- ⚠️ MEDIUM RISK: Validation failures may indicate degrading code quality")
            
        if metrics.run_time > 900:  # Over 15 minutes
            risks.append("- ⚠️ MEDIUM RISK: Excessive task duration may indicate inefficiency")
            
        return '\n'.join(risks) if risks else "- No significant risks identified"
    
    def _generate_process_recommendations(self, metrics: TaskMetrics, performance_summary: Dict) -> str:
        """Generate process improvement recommendations"""
        recommendations = []
        
        if not metrics.validation_passed:
            recommendations.append("- Implement pre-commit hooks to catch validation issues earlier")
            
        if metrics.run_time > 600:
            recommendations.append("- Break down large tasks into smaller, more manageable subtasks")
            
        success_rate = float(performance_summary.get('success_rate', '0%').replace('%', ''))
        if success_rate < 80:
            recommendations.append("- Review and improve task planning and execution strategies")
            
        return '\n'.join(recommendations) if recommendations else "- Current process appears effective"
    
    def _generate_technical_recommendations(self, diff_analysis: Dict, metrics: TaskMetrics) -> str:
        """Generate technical improvement recommendations"""
        recommendations = []
        
        if not diff_analysis.get('has_tests'):
            recommendations.append("- Add comprehensive test coverage for all new functionality")
            
        if metrics.coverage_percentage and metrics.coverage_percentage < 80:
            recommendations.append("- Increase test coverage to meet 80% minimum threshold")
            
        if diff_analysis.get('lines_added', 0) > 200:
            recommendations.append("- Consider refactoring large changes into smaller, more focused commits")
            
        return '\n'.join(recommendations) if recommendations else "- Technical approach appears sound"
    
    def _compare_recent_performance(self, recent_tasks: List[Dict], current_metrics: TaskMetrics) -> str:
        """Compare current performance with recent tasks"""
        if not recent_tasks:
            return "No recent tasks available for comparison"
        
        comparison = []
        
        # Success rate comparison
        recent_successes = sum(1 for task in recent_tasks if task.get('success') == 'True')
        recent_success_rate = (recent_successes / len(recent_tasks)) * 100
        
        if current_metrics.success:
            if recent_success_rate < 80:
                comparison.append(f"- 📈 Current success improves recent trend ({recent_success_rate:.1f}% recent success rate)")
            else:
                comparison.append(f"- ✅ Maintaining high success rate ({recent_success_rate:.1f}%)")
        else:
            comparison.append(f"- 📉 Current failure impacts success rate (was {recent_success_rate:.1f}%)")
        
        # Runtime comparison
        if recent_tasks:
            recent_runtimes = [float(task.get('run_time', 0)) for task in recent_tasks if task.get('run_time')]
            if recent_runtimes:
                avg_recent_runtime = sum(recent_runtimes) / len(recent_runtimes)
                if current_metrics.run_time < avg_recent_runtime:
                    improvement = ((avg_recent_runtime - current_metrics.run_time) / avg_recent_runtime) * 100
                    comparison.append(f"- ⚡ Runtime improved by {improvement:.1f}% vs recent average")
                elif current_metrics.run_time > avg_recent_runtime * 1.2:
                    degradation = ((current_metrics.run_time - avg_recent_runtime) / avg_recent_runtime) * 100
                    comparison.append(f"- 🐌 Runtime degraded by {degradation:.1f}% vs recent average")
        
        return '\n'.join(comparison) if comparison else "Performance consistent with recent trends"

def collect_task_metrics(task_name: str, changed_files: List[str], start_time: float,
                        success: bool, validation_passed: bool) -> TaskMetrics:
    """Collect comprehensive metrics for a completed task"""
    
    end_time = time.time()
    run_time = end_time - start_time
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Get commit hash
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=ROOT
        )
        commit_hash = result.stdout.strip() if result.returncode == 0 else "unknown"
    except:
        commit_hash = "unknown"
    
    # Get test results
    tests_passed = False
    test_count = 0
    try:
        test_result = TestTool.run_tests()
        tests_passed = test_result.success
        if test_result.data and isinstance(test_result.data, dict):
            test_count = test_result.data.get('test_count', 0)
    except:
        pass
    
    # Get git diff stats
    lines_added = 0
    lines_removed = 0
    try:
        result = subprocess.run(
            ["git", "diff", "--numstat", "HEAD~1", "HEAD"],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=ROOT
        )
        
        if result.returncode == 0:
            for line in result.stdout.split('\n'):
                if line.strip():
                    parts = line.split('\t')
                    if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
                        lines_added += int(parts[0])
                        lines_removed += int(parts[1])
    except:
        pass
    
    # Get coverage percentage (if available)
    coverage_percentage = None
    # This would be populated by the validation system if coverage data is available
    
    return TaskMetrics(
        task_name=task_name,
        files_changed=changed_files,
        tests_passed=tests_passed,
        commit_hash=commit_hash,
        run_time=run_time,
        timestamp=timestamp,
        success=success,
        validation_passed=validation_passed,
        lines_added=lines_added,
        lines_removed=lines_removed,
        test_count=test_count,
        coverage_percentage=coverage_percentage
    )

# Global instances for easy access
performance_tracker = PerformanceTracker()
agent_critic = AgentCritic(performance_tracker)