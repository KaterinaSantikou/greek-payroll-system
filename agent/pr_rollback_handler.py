#!/usr/bin/env python3
"""
PR Rollback Handler
Monitors GitHub PRs for rejection and automatically reverts commits when PRs are closed with "rejected" label.
"""

import json
import pathlib
import subprocess
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

# Import tool result for consistency
try:
    from agent.tools import ToolResult, ROOT, GitTool
except ImportError:
    from tools import ToolResult, ROOT, GitTool

@dataclass
class PRRollbackInfo:
    """Information about a PR rollback operation"""
    pr_number: int
    commit_hash: str
    task_id: str
    rollback_reason: str
    timestamp: str
    success: bool

class PRRollbackHandler:
    """Handles automatic rollback when PRs are rejected"""
    
    def __init__(self):
        self.rollback_log = ROOT / "agent" / "pr_rollbacks.json"
        self.task_mapping = ROOT / "agent" / "pr_task_mapping.json"
        self.ensure_files()
    
    def ensure_files(self):
        """Ensure required files exist"""
        if not self.rollback_log.exists():
            with open(self.rollback_log, 'w') as f:
                json.dump([], f)
        
        if not self.task_mapping.exists():
            with open(self.task_mapping, 'w') as f:
                json.dump({}, f)
    
    def register_pr_commit(self, pr_number: int, commit_hash: str, task_id: str):
        """Register a PR with its associated commit and task"""
        try:
            with open(self.task_mapping, 'r') as f:
                mapping = json.load(f)
            
            mapping[str(pr_number)] = {
                'commit_hash': commit_hash,
                'task_id': task_id,
                'timestamp': datetime.now().isoformat(),
                'status': 'open'
            }
            
            with open(self.task_mapping, 'w') as f:
                json.dump(mapping, f, indent=2)
            
            print(f"📋 Registered PR #{pr_number} with commit {commit_hash[:8]} for task {task_id}")
            
        except Exception as e:
            print(f"⚠️ Failed to register PR commit: {e}")
    
    def check_github_pr_status(self, pr_number: int) -> Tuple[str, List[str]]:
        """Check GitHub PR status and labels using GitHub CLI"""
        try:
            # Check if GitHub CLI is available
            gh_check = subprocess.run(
                ["gh", "--version"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if gh_check.returncode != 0:
                print("⚠️ GitHub CLI not available - cannot check PR status")
                return "unknown", []
            
            # Get PR information
            result = subprocess.run(
                ["gh", "pr", "view", str(pr_number), "--json", "state,labels"],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                pr_data = json.loads(result.stdout)
                state = pr_data.get('state', 'unknown')
                labels = [label['name'] for label in pr_data.get('labels', [])]
                return state, labels
            else:
                print(f"⚠️ Failed to get PR status: {result.stderr}")
                return "unknown", []
                
        except subprocess.TimeoutExpired:
            print("⚠️ GitHub API request timed out")
            return "unknown", []
        except json.JSONDecodeError:
            print("⚠️ Invalid JSON response from GitHub API")
            return "unknown", []
        except Exception as e:
            print(f"⚠️ Error checking PR status: {e}")
            return "unknown", []
    
    def simulate_pr_check(self, pr_number: int, state: str, labels: List[str]) -> Tuple[str, List[str]]:
        """Simulate PR status for testing (when GitHub CLI not available)"""
        print(f"🧪 Simulating PR #{pr_number} status: {state}, labels: {labels}")
        return state, labels
    
    def revert_commit(self, commit_hash: str) -> ToolResult:
        """Revert a specific commit"""
        start_time = time.time()
        
        try:
            print(f"🔄 Reverting commit {commit_hash[:8]}...")
            
            # Create revert commit
            result = subprocess.run(
                ["git", "revert", "--no-edit", commit_hash],
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            duration = time.time() - start_time
            
            if result.returncode == 0:
                return ToolResult(
                    success=True,
                    message=f"Successfully reverted commit {commit_hash[:8]} in {duration:.1f}s",
                    data=f"Revert commit created for {commit_hash}",
                    duration=duration
                )
            else:
                return ToolResult(
                    success=False,
                    message=f"Failed to revert commit {commit_hash[:8]}",
                    error=result.stderr,
                    duration=duration
                )
                
        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Commit revert timed out",
                error="Git revert process exceeded timeout",
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Commit revert error",
                error=str(e),
                duration=duration
            )
    
    def mark_task_skipped(self, task_id: str, reason: str):
        """Mark a task as skipped due to PR rejection"""
        try:
            # Look for task file and mark it as skipped
            tasks_dir = ROOT / "tasks"
            if tasks_dir.exists():
                for task_file in tasks_dir.glob("*.md"):
                    if task_id in task_file.name or task_id in task_file.read_text():
                        # Create a skipped marker file
                        skipped_file = task_file.with_suffix('.skipped')
                        with open(skipped_file, 'w') as f:
                            f.write(f"Task skipped due to PR rejection\n")
                            f.write(f"Reason: {reason}\n")
                            f.write(f"Timestamp: {datetime.now().isoformat()}\n")
                        
                        print(f"📝 Marked task {task_id} as skipped: {reason}")
                        return
            
            print(f"📝 Task {task_id} marked as skipped (file not found): {reason}")
            
        except Exception as e:
            print(f"⚠️ Error marking task as skipped: {e}")
    
    def log_rollback(self, rollback_info: PRRollbackInfo):
        """Log rollback operation for audit trail"""
        try:
            with open(self.rollback_log, 'r') as f:
                rollbacks = json.load(f)
            
            rollback_data = {
                'pr_number': rollback_info.pr_number,
                'commit_hash': rollback_info.commit_hash,
                'task_id': rollback_info.task_id,
                'rollback_reason': rollback_info.rollback_reason,
                'timestamp': rollback_info.timestamp,
                'success': rollback_info.success
            }
            
            rollbacks.append(rollback_data)
            
            # Keep only last 100 rollbacks
            if len(rollbacks) > 100:
                rollbacks = rollbacks[-100:]
            
            with open(self.rollback_log, 'w') as f:
                json.dump(rollbacks, f, indent=2)
                
        except Exception as e:
            print(f"⚠️ Error logging rollback: {e}")
    
    def process_pr_rejection(self, pr_number: int, commit_hash: str, task_id: str) -> ToolResult:
        """Process a PR rejection by reverting commit and skipping task"""
        start_time = time.time()
        
        print(f"🚨 Processing PR #{pr_number} rejection...")
        
        # Revert the commit
        revert_result = self.revert_commit(commit_hash)
        
        if revert_result.success:
            # Mark task as skipped
            self.mark_task_skipped(task_id, f"PR #{pr_number} rejected")
            
            # Log the rollback
            rollback_info = PRRollbackInfo(
                pr_number=pr_number,
                commit_hash=commit_hash,
                task_id=task_id,
                rollback_reason=f"PR #{pr_number} closed with rejected label",
                timestamp=datetime.now().isoformat(),
                success=True
            )
            self.log_rollback(rollback_info)
            
            # Update task mapping
            self.update_pr_status(pr_number, 'rejected')
            
            duration = time.time() - start_time
            return ToolResult(
                success=True,
                message=f"Successfully processed PR #{pr_number} rejection in {duration:.1f}s",
                data=f"Reverted commit {commit_hash[:8]} and skipped task {task_id}",
                duration=duration
            )
        else:
            # Log failed rollback
            rollback_info = PRRollbackInfo(
                pr_number=pr_number,
                commit_hash=commit_hash,
                task_id=task_id,
                rollback_reason=f"PR #{pr_number} rejected but revert failed",
                timestamp=datetime.now().isoformat(),
                success=False
            )
            self.log_rollback(rollback_info)
            
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message=f"Failed to process PR #{pr_number} rejection",
                error=revert_result.error,
                duration=duration
            )
    
    def update_pr_status(self, pr_number: int, status: str):
        """Update PR status in task mapping"""
        try:
            with open(self.task_mapping, 'r') as f:
                mapping = json.load(f)
            
            pr_key = str(pr_number)
            if pr_key in mapping:
                mapping[pr_key]['status'] = status
                mapping[pr_key]['updated'] = datetime.now().isoformat()
                
                with open(self.task_mapping, 'w') as f:
                    json.dump(mapping, f, indent=2)
                    
        except Exception as e:
            print(f"⚠️ Error updating PR status: {e}")
    
    def check_and_handle_pr_rejections(self) -> ToolResult:
        """Check all open PRs for rejections and handle them"""
        start_time = time.time()
        
        try:
            with open(self.task_mapping, 'r') as f:
                mapping = json.load(f)
            
            rejected_prs = []
            
            for pr_number_str, pr_info in mapping.items():
                if pr_info.get('status') == 'open':
                    pr_number = int(pr_number_str)
                    
                    # Check PR status
                    state, labels = self.check_github_pr_status(pr_number)
                    
                    # Check for rejection
                    if state == 'closed' and 'rejected' in [label.lower() for label in labels]:
                        print(f"🚨 Found rejected PR #{pr_number}")
                        
                        # Process the rejection
                        rejection_result = self.process_pr_rejection(
                            pr_number=pr_number,
                            commit_hash=pr_info['commit_hash'],
                            task_id=pr_info['task_id']
                        )
                        
                        if rejection_result.success:
                            rejected_prs.append(pr_number)
                            print(f"✅ Successfully handled PR #{pr_number} rejection")
                        else:
                            print(f"❌ Failed to handle PR #{pr_number} rejection: {rejection_result.error}")
            
            duration = time.time() - start_time
            
            if rejected_prs:
                return ToolResult(
                    success=True,
                    message=f"Processed {len(rejected_prs)} PR rejections in {duration:.1f}s",
                    data=f"Handled rejected PRs: {rejected_prs}",
                    duration=duration
                )
            else:
                return ToolResult(
                    success=True,
                    message=f"No PR rejections found in {duration:.1f}s",
                    data="All tracked PRs are still open or merged",
                    duration=duration
                )
                
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Error checking PR rejections",
                error=str(e),
                duration=duration
            )
    
    def test_rollback_scenario(self, pr_number: int, commit_hash: str, task_id: str) -> ToolResult:
        """Test rollback scenario with simulated rejected PR"""
        print(f"🧪 Testing rollback scenario for PR #{pr_number}")
        
        # Register the PR
        self.register_pr_commit(pr_number, commit_hash, task_id)
        
        # Simulate rejection
        print(f"🚨 Simulating PR #{pr_number} rejection...")
        
        # Process rejection
        return self.process_pr_rejection(pr_number, commit_hash, task_id)

# Convenience functions for integration with existing tools
def register_pr_for_tracking(pr_number: int, commit_hash: str, task_id: str):
    """Register a PR for rollback tracking"""
    handler = PRRollbackHandler()
    handler.register_pr_commit(pr_number, commit_hash, task_id)

def check_pr_rejections() -> ToolResult:
    """Check for PR rejections and handle rollbacks"""
    handler = PRRollbackHandler()
    return handler.check_and_handle_pr_rejections()

def simulate_pr_rejection(pr_number: int, commit_hash: str, task_id: str) -> ToolResult:
    """Simulate PR rejection for testing"""
    handler = PRRollbackHandler()
    return handler.test_rollback_scenario(pr_number, commit_hash, task_id)