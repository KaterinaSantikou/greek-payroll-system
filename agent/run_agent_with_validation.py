#!/usr/bin/env python3
"""
Agent Runner with Validation Pipeline Integration

Enhanced agent runner that integrates validation pipeline and PR workflow
for safe, automated development with quality gates.
"""

import os
import sys
import json
import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Import our validation and PR workflow modules
from validation_pipeline import ValidationPipeline
from pr_workflow import GitHubPRWorkflow

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AgentWithValidation:
    """Enhanced agent runner with validation pipeline integration"""
    
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.validation_pipeline = ValidationPipeline(str(self.project_root))
        self.pr_workflow = GitHubPRWorkflow(str(self.project_root))
        
        # Configuration
        self.config = self._load_config()
        
    def _load_config(self) -> Dict:
        """Load agent configuration"""
        config_file = self.project_root / "agent" / "config.json"
        default_config = {
            "validation_enabled": True,
            "auto_pr_enabled": True,
            "skip_coverage_check": False,
            "require_manual_approval": True,
            "max_commit_attempts": 3,
            "validation_timeout": 600
        }
        
        try:
            if config_file.exists():
                with open(config_file, 'r') as f:
                    loaded_config = json.load(f)
                    return {**default_config, **loaded_config}
        except Exception as e:
            logger.warning(f"Failed to load config, using defaults: {e}")
            
        return default_config

    def validate_allowed_paths(self) -> bool:
        """Validate that only allowed files will be modified"""
        try:
            allowed_paths_file = self.project_root / "agent" / "allowed_paths.json"
            if not allowed_paths_file.exists():
                logger.error("allowed_paths.json not found - cannot validate file permissions")
                return False
            
            with open(allowed_paths_file, 'r') as f:
                allowed_config = json.load(f)
            
            # Get changed files
            changed_files = self.validation_pipeline.get_changed_files()
            
            if not changed_files:
                logger.info("No changed files to validate")
                return True
            
            # Validate file permissions
            result = self.validation_pipeline.validate_file_permissions(changed_files)
            
            if not result.success:
                logger.error(f"File permission validation failed: {result.error}")
                return False
                
            logger.info("✅ File permissions validated")
            return True
            
        except Exception as e:
            logger.error(f"Failed to validate allowed paths: {e}")
            return False

    def run_pre_commit_validation(self) -> Dict[str, any]:
        """Run comprehensive pre-commit validation"""
        logger.info("🔍 Running pre-commit validation pipeline...")
        
        # Validate file permissions first
        if not self.validate_allowed_paths():
            return {
                'success': False,
                'reason': 'File permission validation failed',
                'details': {'file_permissions': {'success': False, 'error': 'Unauthorized file modifications detected'}}
            }
        
        # Run full validation pipeline
        results = self.validation_pipeline.run_full_validation(
            skip_coverage=self.config.get('skip_coverage_check', False)
        )
        
        # Determine if validation passed
        should_discard, reason = self.validation_pipeline.should_discard_commit(results)
        
        return {
            'success': not should_discard,
            'reason': reason,
            'details': results
        }

    def create_commit_with_validation(self, commit_message: str = None) -> bool:
        """Create commit with validation, discard if validation fails"""
        max_attempts = self.config.get('max_commit_attempts', 3)
        
        for attempt in range(max_attempts):
            logger.info(f"🔄 Commit attempt {attempt + 1}/{max_attempts}")
            
            if not self.config.get('validation_enabled', True):
                logger.warning("⚠️  Validation disabled - skipping checks")
                return True
            
            # Run validation
            validation_result = self.run_pre_commit_validation()
            
            if validation_result['success']:
                logger.info("✅ Validation passed - commit approved")
                return True
            else:
                logger.error(f"❌ Validation failed: {validation_result['reason']}")
                
                # Log detailed validation results
                for name, result in validation_result['details'].items():
                    if hasattr(result, 'success') and not result.success:
                        logger.error(f"  - {name}: {getattr(result, 'error', 'Unknown error')}")
                
                # Discard changes (reset to last commit)
                logger.warning("🗑️  Discarding failed commit...")
                try:
                    subprocess.run(['git', 'reset', '--hard', 'HEAD'], 
                                 cwd=self.project_root, check=True)
                    subprocess.run(['git', 'clean', '-fd'], 
                                 cwd=self.project_root, check=True)
                    logger.info("Changes discarded successfully")
                except subprocess.CalledProcessError as e:
                    logger.error(f"Failed to discard changes: {e}")
                    return False
                
                if attempt < max_attempts - 1:
                    logger.info("🔄 Retrying with fresh state...")
                else:
                    logger.error("❌ Maximum commit attempts reached - giving up")
                    return False
        
        return False

    def execute_pr_workflow_if_enabled(self, commit_message: str = None) -> bool:
        """Execute PR workflow if enabled and validation passed"""
        if not self.config.get('auto_pr_enabled', True):
            logger.info("📋 PR workflow disabled - skipping")
            return True
            
        logger.info("🔀 Executing PR workflow...")
        
        try:
            success, message = self.pr_workflow.execute_pr_workflow(commit_message)
            
            if success:
                logger.info(f"✅ PR workflow completed: {message}")
                return True
            else:
                logger.error(f"❌ PR workflow failed: {message}")
                return False
                
        except Exception as e:
            logger.error(f"❌ PR workflow crashed: {e}")
            return False

    def run_agent_with_safety(self, agent_script: str = "run_agent.py", 
                             commit_message: str = None) -> bool:
        """Run the agent with full safety pipeline"""
        logger.info("🤖 Starting agent with validation pipeline...")
        
        # Generate commit message if not provided
        if not commit_message:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            commit_message = f"Agent development update - {timestamp}"
        
        try:
            # Step 1: Run the actual agent
            agent_path = self.project_root / "agent" / agent_script
            if agent_path.exists():
                logger.info(f"▶️  Running agent: {agent_script}")
                result = subprocess.run(
                    [sys.executable, str(agent_path)],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                    timeout=self.config.get('validation_timeout', 600)
                )
                
                if result.returncode != 0:
                    logger.error(f"Agent execution failed: {result.stderr}")
                    return False
                    
                logger.info("✅ Agent execution completed")
            else:
                logger.warning(f"Agent script {agent_script} not found - skipping agent execution")
            
            # Step 2: Validate proposed changes
            if not self.create_commit_with_validation(commit_message):
                logger.error("❌ Commit validation failed - agent changes rejected")
                return False
            
            # Step 3: Execute PR workflow if enabled
            if not self.execute_pr_workflow_if_enabled(commit_message):
                logger.warning("⚠️  PR workflow failed but commit was successful")
                # Don't fail the entire process if PR creation fails
            
            logger.info("🎉 Agent execution with validation completed successfully!")
            return True
            
        except subprocess.TimeoutExpired:
            logger.error("❌ Agent execution timed out")
            return False
        except Exception as e:
            logger.error(f"❌ Agent execution failed: {e}")
            return False

    def get_validation_status(self) -> Dict[str, any]:
        """Get current validation system status"""
        try:
            # Check validation log
            validation_log = self.project_root / "agent" / "validation_log.json"
            latest_validation = None
            
            if validation_log.exists():
                with open(validation_log, 'r') as f:
                    log_entries = json.load(f)
                    if log_entries:
                        latest_validation = log_entries[-1]
            
            # Check GitHub setup
            github_valid, github_message = self.pr_workflow.validate_github_setup()
            
            # Check allowed paths config
            allowed_paths_file = self.project_root / "agent" / "allowed_paths.json"
            allowed_paths_valid = allowed_paths_file.exists()
            
            status = {
                'validation_pipeline': {
                    'enabled': self.config.get('validation_enabled', True),
                    'latest_run': latest_validation.get('timestamp') if latest_validation else None,
                    'latest_success': all(
                        result.get('success', False) 
                        for result in latest_validation.get('results', {}).values()
                    ) if latest_validation else None
                },
                'pr_workflow': {
                    'enabled': self.config.get('auto_pr_enabled', True),
                    'github_api_valid': github_valid,
                    'github_message': github_message
                },
                'security': {
                    'allowed_paths_configured': allowed_paths_valid,
                    'file_restrictions_active': True
                },
                'configuration': self.config
            }
            
            return status
            
        except Exception as e:
            return {'error': f"Failed to get validation status: {e}"}

def main():
    """Main entry point"""
    agent_runner = AgentWithValidation()
    
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description='Run AI agent with validation pipeline')
    parser.add_argument('--agent-script', default='run_agent.py', 
                       help='Agent script to run (default: run_agent.py)')
    parser.add_argument('--commit-message', help='Custom commit message')
    parser.add_argument('--status', action='store_true', 
                       help='Show validation system status and exit')
    parser.add_argument('--validate-only', action='store_true',
                       help='Run validation only without agent execution')
    
    args = parser.parse_args()
    
    try:
        if args.status:
            # Show validation status
            status = agent_runner.get_validation_status()
            print(json.dumps(status, indent=2))
            return
        
        if args.validate_only:
            # Run validation only
            result = agent_runner.run_pre_commit_validation()
            print(f"Validation result: {'PASS' if result['success'] else 'FAIL'}")
            print(f"Reason: {result['reason']}")
            
            if not result['success']:
                sys.exit(1)
            return
        
        # Run full agent with validation
        success = agent_runner.run_agent_with_safety(
            agent_script=args.agent_script,
            commit_message=args.commit_message
        )
        
        if not success:
            logger.error("❌ Agent execution with validation failed")
            sys.exit(1)
            
        logger.info("✅ Agent execution with validation completed successfully")
        
    except KeyboardInterrupt:
        logger.info("🛑 Agent execution cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()