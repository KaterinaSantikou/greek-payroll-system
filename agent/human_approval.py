#!/usr/bin/env python3
"""
Human-in-the-loop approval system for the continuous agent.
Provides manual escalation triggers for high-risk actions.
"""

import os
import json
import time
import pathlib
import subprocess
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

try:
    from agent.tools import GitTool, ToolResult
except ImportError:
    from tools import GitTool, ToolResult

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONFIG_FILE = ROOT / "agent" / "config.json"
APPROVAL_REQUESTS_DIR = ROOT / "agent" / "approval_requests"

@dataclass
class ApprovalRequest:
    """Request for human approval of changes"""
    request_id: str
    task_name: str
    files_changed: List[str]
    lines_added: int
    lines_removed: int
    git_diff: str
    risk_level: str
    timestamp: str
    status: str  # 'pending', 'approved', 'rejected', 'expired'
    auto_approvable: bool
    reasoning: str

class HumanApprovalConfig:
    """Configuration for human approval system"""
    
    def __init__(self, config_path: Optional[pathlib.Path] = None):
        self.config_path = config_path or CONFIG_FILE
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                # Default configuration
                default_config = {
                    "require_manual_approval": True,
                    "high_risk_threshold": {
                        "files_changed": 5,
                        "lines_changed": 200,
                        "critical_files": [
                            "package.json",
                            "server/index.ts", 
                            "shared/schema.ts",
                            "drizzle.config.ts"
                        ]
                    },
                    "auto_approval_conditions": {
                        "test_files_only": True,
                        "documentation_only": True,
                        "small_changes": True
                    },
                    "approval_timeout_minutes": 30
                }
                
                # Create config file
                self.config_path.parent.mkdir(parents=True, exist_ok=True)
                with open(self.config_path, 'w', encoding='utf-8') as f:
                    json.dump(default_config, f, indent=2)
                
                return default_config
                
        except Exception as e:
            print(f"⚠️ Could not load approval config: {e}")
            return {"require_manual_approval": False}
    
    @property
    def require_manual_approval(self) -> bool:
        """Whether manual approval is required"""
        return self.config.get("require_manual_approval", False)
    
    @property
    def high_risk_threshold(self) -> Dict[str, Any]:
        """Thresholds for determining high-risk changes"""
        return self.config.get("high_risk_threshold", {})
    
    @property 
    def auto_approval_conditions(self) -> Dict[str, bool]:
        """Conditions that allow automatic approval"""
        return self.config.get("auto_approval_conditions", {})
    
    @property
    def approval_timeout_minutes(self) -> int:
        """Timeout for approval requests in minutes"""
        return self.config.get("approval_timeout_minutes", 30)

class HumanApprovalSystem:
    """Human-in-the-loop approval system"""
    
    def __init__(self):
        self.config = HumanApprovalConfig()
        self.requests_dir = APPROVAL_REQUESTS_DIR
        self.requests_dir.mkdir(parents=True, exist_ok=True)
    
    def assess_change_risk(self, changed_files: List[str], git_diff: str) -> Tuple[str, str, bool]:
        """
        Assess the risk level of proposed changes.
        
        Returns:
            Tuple of (risk_level, reasoning, auto_approvable)
        """
        if not self.config.require_manual_approval:
            return "low", "Manual approval disabled", True
        
        # Analyze change characteristics
        lines_added = git_diff.count('\n+') if git_diff else 0
        lines_removed = git_diff.count('\n-') if git_diff else 0
        total_lines_changed = lines_added + lines_removed
        
        # Check critical files
        critical_files = self.config.high_risk_threshold.get("critical_files", [])
        touches_critical_files = any(
            any(critical in file for critical in critical_files)
            for file in changed_files
        )
        
        # Risk assessment logic
        risk_factors = []
        auto_approvable = True
        
        # High-risk conditions
        if len(changed_files) > self.config.high_risk_threshold.get("files_changed", 5):
            risk_factors.append(f"Many files changed ({len(changed_files)})")
            auto_approvable = False
        
        if total_lines_changed > self.config.high_risk_threshold.get("lines_changed", 200):
            risk_factors.append(f"Large change ({total_lines_changed} lines)")
            auto_approvable = False
        
        if touches_critical_files:
            risk_factors.append("Modifies critical system files")
            auto_approvable = False
        
        # Check for database schema changes
        if any("schema" in file.lower() or "migration" in file.lower() for file in changed_files):
            risk_factors.append("Database schema changes")
            auto_approvable = False
        
        # Check for dependency changes
        if any("package.json" in file or "requirements.txt" in file for file in changed_files):
            risk_factors.append("Dependency modifications")
            auto_approvable = False
        
        # Auto-approval conditions
        test_files_only = all(
            "test" in file.lower() or "spec" in file.lower() 
            for file in changed_files
        )
        
        documentation_only = all(
            file.lower().endswith(('.md', '.txt', '.rst')) 
            for file in changed_files
        )
        
        small_change = (
            len(changed_files) <= 2 and 
            total_lines_changed <= 50
        )
        
        # Override auto-approval for safe changes
        if (test_files_only and self.config.auto_approval_conditions.get("test_files_only", True)) or \
           (documentation_only and self.config.auto_approval_conditions.get("documentation_only", True)) or \
           (small_change and self.config.auto_approval_conditions.get("small_changes", True)):
            return "low", "Safe change - auto-approved", True
        
        # Determine risk level
        if len(risk_factors) == 0:
            risk_level = "low"
            reasoning = "No significant risk factors identified"
        elif len(risk_factors) <= 2:
            risk_level = "medium" 
            reasoning = f"Moderate risk: {'; '.join(risk_factors)}"
        else:
            risk_level = "high"
            reasoning = f"High risk: {'; '.join(risk_factors)}"
            auto_approvable = False
        
        return risk_level, reasoning, auto_approvable
    
    def request_approval(self, task_name: str, changed_files: List[str], 
                        git_diff: str) -> ApprovalRequest:
        """Request human approval for changes"""
        
        # Generate unique request ID
        timestamp = datetime.now()
        request_id = f"{task_name}_{timestamp.strftime('%Y%m%d_%H%M%S')}"
        
        # Assess risk
        risk_level, reasoning, auto_approvable = self.assess_change_risk(changed_files, git_diff)
        
        # Count lines changed
        lines_added = git_diff.count('\n+') if git_diff else 0
        lines_removed = git_diff.count('\n-') if git_diff else 0
        
        # Create approval request
        request = ApprovalRequest(
            request_id=request_id,
            task_name=task_name,
            files_changed=changed_files,
            lines_added=lines_added,
            lines_removed=lines_removed,
            git_diff=git_diff,
            risk_level=risk_level,
            timestamp=timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            status="pending",
            auto_approvable=auto_approvable,
            reasoning=reasoning
        )
        
        # Save request to file
        self._save_approval_request(request)
        
        return request
    
    def _save_approval_request(self, request: ApprovalRequest):
        """Save approval request to file"""
        try:
            request_file = self.requests_dir / f"{request.request_id}.json"
            
            request_data = {
                "request_id": request.request_id,
                "task_name": request.task_name,
                "files_changed": request.files_changed,
                "lines_added": request.lines_added,
                "lines_removed": request.lines_removed,
                "git_diff": request.git_diff,
                "risk_level": request.risk_level,
                "timestamp": request.timestamp,
                "status": request.status,
                "auto_approvable": request.auto_approvable,
                "reasoning": request.reasoning
            }
            
            with open(request_file, 'w', encoding='utf-8') as f:
                json.dump(request_data, f, indent=2)
            
            # Also create a human-readable summary
            summary_file = self.requests_dir / f"{request.request_id}_summary.md"
            self._create_approval_summary(request, summary_file)
            
        except Exception as e:
            print(f"⚠️ Could not save approval request: {e}")
    
    def _create_approval_summary(self, request: ApprovalRequest, summary_file: pathlib.Path):
        """Create human-readable approval summary"""
        
        summary_content = f"""# Approval Request: {request.task_name}

**Request ID:** {request.request_id}
**Timestamp:** {request.timestamp}
**Risk Level:** {request.risk_level.upper()}
**Status:** {request.status.upper()}

## Change Summary
- **Files Changed:** {len(request.files_changed)}
- **Lines Added:** {request.lines_added}
- **Lines Removed:** {request.lines_removed}
- **Auto-Approvable:** {'Yes' if request.auto_approvable else 'No'}

## Risk Assessment
{request.reasoning}

## Files Modified
{chr(10).join(f"- `{file}`" for file in request.files_changed)}

## Git Diff Preview
```diff
{request.git_diff[:1000]}{'...' if len(request.git_diff) > 1000 else ''}
```

## Approval Instructions

### To APPROVE these changes:
```bash
echo "approved" > agent/approval_requests/{request.request_id}_decision.txt
```

### To REJECT these changes:
```bash
echo "rejected" > agent/approval_requests/{request.request_id}_decision.txt
```

### To approve with a comment:
```bash
echo "approved: looks good, proceed with deployment" > agent/approval_requests/{request.request_id}_decision.txt
```

---
*Generated automatically by Human Approval System*
*Expires: {(datetime.strptime(request.timestamp, '%Y-%m-%d %H:%M:%S') + timedelta(minutes=30)).strftime('%Y-%m-%d %H:%M:%S')}*
"""
        
        try:
            with open(summary_file, 'w', encoding='utf-8') as f:
                f.write(summary_content)
        except Exception as e:
            print(f"⚠️ Could not create approval summary: {e}")
    
    def wait_for_approval(self, request: ApprovalRequest) -> Tuple[bool, str]:
        """
        Wait for human approval or timeout.
        
        Returns:
            Tuple of (approved, reason)
        """
        print(f"\n🚨 HUMAN APPROVAL REQUIRED")
        print(f"📋 Task: {request.task_name}")
        print(f"⚠️ Risk Level: {request.risk_level.upper()}")
        print(f"💭 Reasoning: {request.reasoning}")
        print(f"📁 Files: {', '.join(request.files_changed)}")
        print(f"📊 Changes: +{request.lines_added} -{request.lines_removed} lines")
        
        if request.auto_approvable:
            print(f"✅ This change is auto-approvable but manual approval is enabled")
        
        print(f"\n📝 Review the full details at:")
        print(f"   agent/approval_requests/{request.request_id}_summary.md")
        
        print(f"\n⏰ Waiting for approval (timeout: {self.config.approval_timeout_minutes} minutes)...")
        print(f"   To approve: echo 'approved' > agent/approval_requests/{request.request_id}_decision.txt")
        print(f"   To reject:  echo 'rejected' > agent/approval_requests/{request.request_id}_decision.txt")
        
        # Decision file path
        decision_file = self.requests_dir / f"{request.request_id}_decision.txt"
        
        # Calculate timeout
        start_time = time.time()
        timeout_seconds = self.config.approval_timeout_minutes * 60
        
        # Wait for decision or timeout
        while time.time() - start_time < timeout_seconds:
            if decision_file.exists():
                try:
                    decision_content = decision_file.read_text(encoding='utf-8').strip().lower()
                    
                    if decision_content.startswith('approved'):
                        print(f"✅ APPROVED by human")
                        return True, decision_content
                    elif decision_content.startswith('rejected'):
                        print(f"❌ REJECTED by human")
                        return False, decision_content
                    else:
                        print(f"⚠️ Invalid decision format: {decision_content}")
                        
                except Exception as e:
                    print(f"⚠️ Could not read decision file: {e}")
            
            # Wait before checking again
            time.sleep(5)
        
        # Timeout reached
        print(f"⏰ TIMEOUT: No approval received within {self.config.approval_timeout_minutes} minutes")
        return False, f"timeout after {self.config.approval_timeout_minutes} minutes"
    
    def cleanup_old_requests(self, max_age_days: int = 7):
        """Clean up old approval requests"""
        try:
            cutoff_time = datetime.now() - timedelta(days=max_age_days)
            
            for request_file in self.requests_dir.glob("*.json"):
                try:
                    with open(request_file, 'r', encoding='utf-8') as f:
                        request_data = json.load(f)
                    
                    request_time = datetime.strptime(request_data['timestamp'], '%Y-%m-%d %H:%M:%S')
                    
                    if request_time < cutoff_time:
                        # Remove old request files
                        request_file.unlink()
                        
                        # Remove associated files
                        request_id = request_data['request_id']
                        summary_file = self.requests_dir / f"{request_id}_summary.md"
                        decision_file = self.requests_dir / f"{request_id}_decision.txt"
                        
                        if summary_file.exists():
                            summary_file.unlink()
                        if decision_file.exists():
                            decision_file.unlink()
                            
                except Exception as e:
                    print(f"⚠️ Could not process request file {request_file}: {e}")
                    
        except Exception as e:
            print(f"⚠️ Could not cleanup old requests: {e}")

def require_human_approval(task_name: str, changed_files: List[str], 
                          git_diff: str) -> bool:
    """
    Main function to handle human approval workflow.
    
    Returns:
        True if approved or auto-approved, False if rejected or timed out
    """
    approval_system = HumanApprovalSystem()
    
    # Clean up old requests first
    approval_system.cleanup_old_requests()
    
    # Check if manual approval is required
    if not approval_system.config.require_manual_approval:
        print("🔓 Manual approval disabled - proceeding automatically")
        return True
    
    # Create approval request
    request = approval_system.request_approval(task_name, changed_files, git_diff)
    
    # If auto-approvable and we trust auto-approval
    if request.auto_approvable:
        print(f"🚀 Auto-approved: {request.reasoning}")
        return True
    
    # Wait for human approval
    approved, reason = approval_system.wait_for_approval(request)
    
    if approved:
        print(f"✅ Changes approved: {reason}")
        return True
    else:
        print(f"❌ Changes rejected or timed out: {reason}")
        return False

# Convenience instances
approval_system = HumanApprovalSystem()
approval_config = HumanApprovalConfig()