#!/usr/bin/env python3
"""
Agent State Manager
Handles state persistence and recovery for cold start resume after Replit restarts.
"""

import json
import pathlib
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime

# Import tool result for consistency
try:
    from agent.tools import ToolResult, ROOT
except ImportError:
    from tools import ToolResult, ROOT

@dataclass
class AgentState:
    """Agent operational state for persistence"""
    backlog_index: int
    last_completed_task: Optional[str]
    pending_tasks: List[str]
    current_iteration: int
    last_checkpoint: str
    startup_timestamp: str
    total_tasks_completed: int
    session_id: str
    
    # Task tracking
    completed_tasks: List[str]
    skipped_tasks: List[str]
    failed_tasks: List[str]
    
    # Operational metadata
    last_git_commit: Optional[str]
    last_pr_number: Optional[int]
    agent_version: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for JSON serialization"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentState':
        """Create state from dictionary"""
        return cls(**data)

class StateManager:
    """Manages agent state persistence and recovery"""
    
    def __init__(self):
        self.state_file = ROOT / "agent" / "agent_state.json"
        self.backup_dir = ROOT / "agent" / "state_backups"
        self.current_state: Optional[AgentState] = None
        self.ensure_files()
    
    def ensure_files(self):
        """Ensure required directories and files exist"""
        # Create backup directory
        self.backup_dir.mkdir(exist_ok=True)
        
        # Create state file if it doesn't exist
        if not self.state_file.exists():
            self.create_initial_state()
    
    def create_initial_state(self) -> AgentState:
        """Create initial agent state"""
        initial_state = AgentState(
            backlog_index=0,
            last_completed_task=None,
            pending_tasks=[],
            current_iteration=0,
            last_checkpoint=datetime.now().isoformat(),
            startup_timestamp=datetime.now().isoformat(),
            total_tasks_completed=0,
            session_id=f"session_{int(time.time())}",
            completed_tasks=[],
            skipped_tasks=[],
            failed_tasks=[],
            last_git_commit=None,
            last_pr_number=None,
            agent_version="1.0.0"
        )
        
        self.current_state = initial_state
        self.save_state(initial_state)
        print(f"📝 Created initial agent state: {initial_state.session_id}")
        return initial_state
    
    def load_state(self) -> ToolResult:
        """Load agent state from persistence"""
        start_time = time.time()
        
        try:
            if not self.state_file.exists():
                self.current_state = self.create_initial_state()
                duration = time.time() - start_time
                return ToolResult(
                    success=True,
                    message=f"Created new agent state in {duration:.1f}s",
                    data=f"Session: {self.current_state.session_id}",
                    duration=duration
                )
            
            with open(self.state_file, 'r') as f:
                state_data = json.load(f)
            
            self.current_state = AgentState.from_dict(state_data)
            duration = time.time() - start_time
            
            # Check if this is a cold start (different session)
            current_time = datetime.now().isoformat()
            is_cold_start = self.current_state.startup_timestamp != current_time
            
            if is_cold_start:
                print(f"🔄 Cold start detected - resuming from previous session")
                print(f"   Previous session: {self.current_state.session_id}")
                print(f"   Last checkpoint: {self.current_state.last_checkpoint}")
                print(f"   Completed tasks: {self.current_state.total_tasks_completed}")
                print(f"   Backlog index: {self.current_state.backlog_index}")
                
                # Update for new session but keep progress
                self.current_state.startup_timestamp = current_time
                self.current_state.session_id = f"session_{int(time.time())}"
                self.save_state(self.current_state)
            
            return ToolResult(
                success=True,
                message=f"Loaded agent state in {duration:.1f}s",
                data=f"Session: {self.current_state.session_id}, Tasks completed: {self.current_state.total_tasks_completed}",
                duration=duration
            )
            
        except json.JSONDecodeError as e:
            duration = time.time() - start_time
            print(f"⚠️ Corrupted state file, creating new state")
            self.current_state = self.create_initial_state()
            return ToolResult(
                success=True,
                message="Recovered from corrupted state",
                data=f"Created new session: {self.current_state.session_id}",
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Failed to load agent state",
                error=str(e),
                duration=duration
            )
    
    def save_state(self, state: AgentState) -> ToolResult:
        """Save agent state to persistence"""
        start_time = time.time()
        
        try:
            # Update checkpoint timestamp
            state.last_checkpoint = datetime.now().isoformat()
            
            # Create backup of current state
            if self.state_file.exists():
                backup_name = f"agent_state_backup_{int(time.time())}.json"
                backup_path = self.backup_dir / backup_name
                with open(self.state_file, 'r') as src, open(backup_path, 'w') as dst:
                    dst.write(src.read())
            
            # Save new state
            with open(self.state_file, 'w') as f:
                json.dump(state.to_dict(), f, indent=2)
            
            duration = time.time() - start_time
            return ToolResult(
                success=True,
                message=f"Saved agent state in {duration:.1f}s",
                data=f"Checkpoint: {state.last_checkpoint}",
                duration=duration
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return ToolResult(
                success=False,
                message="Failed to save agent state",
                error=str(e),
                duration=duration
            )
    
    def update_backlog_index(self, index: int):
        """Update backlog index"""
        if self.current_state:
            self.current_state.backlog_index = index
            self.save_state(self.current_state)
    
    def mark_task_completed(self, task_id: str):
        """Mark a task as completed"""
        if self.current_state:
            self.current_state.last_completed_task = task_id
            self.current_state.total_tasks_completed += 1
            if task_id not in self.current_state.completed_tasks:
                self.current_state.completed_tasks.append(task_id)
            # Remove from pending if present
            if task_id in self.current_state.pending_tasks:
                self.current_state.pending_tasks.remove(task_id)
            self.save_state(self.current_state)
            print(f"✅ Marked task completed: {task_id}")
    
    def mark_task_skipped(self, task_id: str, reason: str):
        """Mark a task as skipped"""
        if self.current_state:
            if task_id not in self.current_state.skipped_tasks:
                self.current_state.skipped_tasks.append(task_id)
            # Remove from pending if present
            if task_id in self.current_state.pending_tasks:
                self.current_state.pending_tasks.remove(task_id)
            self.save_state(self.current_state)
            print(f"⏭️ Marked task skipped: {task_id} - {reason}")
    
    def mark_task_failed(self, task_id: str, error: str):
        """Mark a task as failed"""
        if self.current_state:
            if task_id not in self.current_state.failed_tasks:
                self.current_state.failed_tasks.append(task_id)
            # Remove from pending if present
            if task_id in self.current_state.pending_tasks:
                self.current_state.pending_tasks.remove(task_id)
            self.save_state(self.current_state)
            print(f"❌ Marked task failed: {task_id} - {error}")
    
    def add_pending_task(self, task_id: str):
        """Add a task to pending list"""
        if self.current_state and task_id not in self.current_state.pending_tasks:
            self.current_state.pending_tasks.append(task_id)
            self.save_state(self.current_state)
            print(f"📋 Added pending task: {task_id}")
    
    def remove_pending_task(self, task_id: str):
        """Remove a task from pending list"""
        if self.current_state and task_id in self.current_state.pending_tasks:
            self.current_state.pending_tasks.remove(task_id)
            self.save_state(self.current_state)
    
    def update_git_info(self, commit_hash: str, pr_number: Optional[int] = None):
        """Update git commit and PR information"""
        if self.current_state:
            self.current_state.last_git_commit = commit_hash
            if pr_number:
                self.current_state.last_pr_number = pr_number
            self.save_state(self.current_state)
    
    def increment_iteration(self):
        """Increment iteration counter"""
        if self.current_state:
            self.current_state.current_iteration += 1
            self.save_state(self.current_state)
    
    def get_resume_info(self) -> Dict[str, Any]:
        """Get information for resuming from cold start"""
        if not self.current_state:
            return {}
        
        return {
            'backlog_index': self.current_state.backlog_index,
            'last_completed_task': self.current_state.last_completed_task,
            'pending_tasks': self.current_state.pending_tasks.copy(),
            'total_completed': self.current_state.total_tasks_completed,
            'current_iteration': self.current_state.current_iteration,
            'last_checkpoint': self.current_state.last_checkpoint,
            'session_id': self.current_state.session_id
        }
    
    def cleanup_old_backups(self, keep_count: int = 10):
        """Clean up old backup files, keeping only the most recent"""
        try:
            backup_files = list(self.backup_dir.glob("agent_state_backup_*.json"))
            if len(backup_files) > keep_count:
                # Sort by modification time and remove oldest
                backup_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
                for old_backup in backup_files[keep_count:]:
                    old_backup.unlink()
                    print(f"🗑️ Cleaned up old backup: {old_backup.name}")
        except Exception as e:
            print(f"⚠️ Error cleaning backups: {e}")
    
    def get_state_summary(self) -> str:
        """Get a summary of current agent state"""
        if not self.current_state:
            return "No state loaded"
        
        return f"""Agent State Summary:
Session: {self.current_state.session_id}
Backlog Index: {self.current_state.backlog_index}
Last Completed: {self.current_state.last_completed_task or 'None'}
Pending Tasks: {len(self.current_state.pending_tasks)}
Total Completed: {self.current_state.total_tasks_completed}
Current Iteration: {self.current_state.current_iteration}
Last Checkpoint: {self.current_state.last_checkpoint}"""

# Global state manager instance
_state_manager = None

def get_state_manager() -> StateManager:
    """Get the global state manager instance"""
    global _state_manager
    if _state_manager is None:
        _state_manager = StateManager()
    return _state_manager

# Convenience functions for integration with existing code
def load_agent_state() -> ToolResult:
    """Load agent state for cold start resume"""
    return get_state_manager().load_state()

def save_agent_state() -> ToolResult:
    """Save current agent state"""
    manager = get_state_manager()
    if manager.current_state:
        return manager.save_state(manager.current_state)
    else:
        manager.create_initial_state()
        return manager.save_state(manager.current_state)

def update_backlog_progress(index: int):
    """Update backlog index progress"""
    get_state_manager().update_backlog_index(index)

def complete_task(task_id: str):
    """Mark a task as completed in state"""
    get_state_manager().mark_task_completed(task_id)

def skip_task(task_id: str, reason: str):
    """Mark a task as skipped in state"""
    get_state_manager().mark_task_skipped(task_id, reason)

def fail_task(task_id: str, error: str):
    """Mark a task as failed in state"""
    get_state_manager().mark_task_failed(task_id, error)

def add_task(task_id: str):
    """Add a task to pending list"""
    get_state_manager().add_pending_task(task_id)

def get_resume_data() -> Dict[str, Any]:
    """Get data for cold start resume"""
    return get_state_manager().get_resume_info()

def increment_agent_iteration():
    """Increment agent iteration counter"""
    get_state_manager().increment_iteration()