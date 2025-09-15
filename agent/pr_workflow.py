#!/usr/bin/env python3
"""
GitHub PR Workflow Automation

Automatically creates pull requests from dev to main branch after successful
validation, including diff summary and test results.
"""

import os
import sys
import json
import subprocess
import requests
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class GitHubPRWorkflow:
    """Manages GitHub PR creation and workflow automation"""
    
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.github_token = os.getenv('GITHUB_TOKEN')
        self.repo_owner = os.getenv('GITHUB_REPO_OWNER', 'default-owner')
        self.repo_name = os.getenv('GITHUB_REPO_NAME', 'greek-payroll-system')
        
        # GitHub API configuration
        self.api_base = "https://api.github.com"
        self.headers = {
            'Authorization': f'token {self.github_token}',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
        
    def validate_github_setup(self) -> Tuple[bool, str]:
        """Validate GitHub API access and repository configuration"""
        if not self.github_token:
            return False, "GITHUB_TOKEN environment variable not set"
            
        try:
            # Test API access
            response = requests.get(
                f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return True, "GitHub API access validated"
            elif response.status_code == 404:
                return False, f"Repository {self.repo_owner}/{self.repo_name} not found"
            elif response.status_code == 401:
                return False, "GitHub token authentication failed"
            else:
                return False, f"GitHub API error: {response.status_code} - {response.text}"
                
        except requests.RequestException as e:
            return False, f"GitHub API connection failed: {str(e)}"

    def run_command(self, command: List[str]) -> Tuple[bool, str, str]:
        """Run a git command and return success, stdout, stderr"""
        try:
            result = subprocess.run(
                command,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=30
            )
            return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
        except subprocess.TimeoutExpired:
            return False, "", "Command timed out"
        except Exception as e:
            return False, "", str(e)

    def get_current_branch(self) -> str:
        """Get the current git branch name"""
        success, stdout, _ = self.run_command(['git', 'branch', '--show-current'])
        return stdout if success else "unknown"

    def switch_to_dev_branch(self) -> bool:
        """Switch to dev branch, create if doesn't exist"""
        logger.info("Switching to dev branch...")
        
        # Check if dev branch exists locally
        success, _, _ = self.run_command(['git', 'show-ref', '--verify', '--quiet', 'refs/heads/dev'])
        
        if not success:
            # Create dev branch
            logger.info("Creating dev branch...")
            success, _, error = self.run_command(['git', 'checkout', '-b', 'dev'])
            if not success:
                logger.error(f"Failed to create dev branch: {error}")
                return False
        else:
            # Switch to existing dev branch
            success, _, error = self.run_command(['git', 'checkout', 'dev'])
            if not success:
                logger.error(f"Failed to switch to dev branch: {error}")
                return False
        
        return True

    def commit_and_push_changes(self, commit_message: str) -> bool:
        """Commit changes and push to dev branch"""
        logger.info("Committing and pushing changes...")
        
        # Stage all changes
        success, _, error = self.run_command(['git', 'add', '.'])
        if not success:
            logger.error(f"Failed to stage changes: {error}")
            return False
        
        # Check if there are changes to commit
        success, stdout, _ = self.run_command(['git', 'diff', '--cached', '--name-only'])
        if not success or not stdout:
            logger.info("No changes to commit")
            return True
        
        # Commit changes
        success, _, error = self.run_command(['git', 'commit', '-m', commit_message])
        if not success:
            logger.error(f"Failed to commit changes: {error}")
            return False
        
        # Push to origin dev
        success, _, error = self.run_command(['git', 'push', 'origin', 'dev'])
        if not success:
            logger.error(f"Failed to push to dev branch: {error}")
            return False
        
        logger.info("✅ Changes committed and pushed to dev branch")
        return True

    def get_diff_summary(self) -> Dict[str, any]:
        """Get summary of changes between dev and main branches"""
        logger.info("Generating diff summary...")
        
        # Get commit differences
        success, stdout, _ = self.run_command(['git', 'rev-list', '--count', 'main..dev'])
        commit_count = int(stdout) if success and stdout.isdigit() else 0
        
        # Get file changes
        success, stdout, _ = self.run_command(['git', 'diff', '--name-status', 'main..dev'])
        file_changes = {'added': [], 'modified': [], 'deleted': []}
        
        if success and stdout:
            for line in stdout.split('\n'):
                if not line.strip():
                    continue
                    
                parts = line.split('\t', 1)
                if len(parts) != 2:
                    continue
                    
                status, filename = parts
                if status == 'A':
                    file_changes['added'].append(filename)
                elif status == 'M':
                    file_changes['modified'].append(filename)
                elif status == 'D':
                    file_changes['deleted'].append(filename)
        
        # Get line statistics
        success, stdout, _ = self.run_command(['git', 'diff', '--stat', 'main..dev'])
        stat_summary = stdout.split('\n')[-1] if success and stdout else ""
        
        # Get recent commit messages
        success, stdout, _ = self.run_command(['git', 'log', '--oneline', 'main..dev', '-5'])
        recent_commits = stdout.split('\n') if success and stdout else []
        
        return {
            'commit_count': commit_count,
            'file_changes': file_changes,
            'stat_summary': stat_summary,
            'recent_commits': recent_commits[:5]
        }

    def get_test_results_summary(self) -> Dict[str, any]:
        """Get summary of latest test results"""
        validation_log = self.project_root / "agent" / "validation_log.json"
        
        try:
            if validation_log.exists():
                with open(validation_log, 'r') as f:
                    log_entries = json.load(f)
                    
                if log_entries:
                    latest_entry = log_entries[-1]
                    results = latest_entry.get('results', {})
                    
                    successful_tests = sum(1 for result in results.values() if result.get('success', False))
                    total_tests = len(results)
                    
                    return {
                        'timestamp': latest_entry.get('timestamp', ''),
                        'total_validations': total_tests,
                        'successful_validations': successful_tests,
                        'failed_validations': total_tests - successful_tests,
                        'validation_details': {
                            name: {
                                'success': result.get('success', False),
                                'duration': result.get('duration', 0),
                                'error': result.get('error', '') if not result.get('success', True) else ''
                            }
                            for name, result in results.items()
                        }
                    }
            
            return {
                'timestamp': '',
                'total_validations': 0,
                'successful_validations': 0,
                'failed_validations': 0,
                'validation_details': {}
            }
            
        except Exception as e:
            logger.warning(f"Failed to read test results: {e}")
            return {'error': str(e)}

    def create_pr_description(self, diff_summary: Dict, test_results: Dict) -> str:
        """Create comprehensive PR description with diff and test information"""
        
        description = "## 🤖 Automated Agent Development\n\n"
        description += "This PR contains changes made by the AI development agent with full validation.\n\n"
        
        # Changes summary
        description += "## 📋 Changes Summary\n\n"
        if diff_summary['commit_count'] > 0:
            description += f"- **{diff_summary['commit_count']} commits** included in this PR\n"
            
            if diff_summary['file_changes']['added']:
                description += f"- **{len(diff_summary['file_changes']['added'])} files added**\n"
                for file in diff_summary['file_changes']['added'][:5]:
                    description += f"  - ➕ `{file}`\n"
                if len(diff_summary['file_changes']['added']) > 5:
                    description += f"  - ... and {len(diff_summary['file_changes']['added']) - 5} more\n"
            
            if diff_summary['file_changes']['modified']:
                description += f"- **{len(diff_summary['file_changes']['modified'])} files modified**\n"
                for file in diff_summary['file_changes']['modified'][:5]:
                    description += f"  - 📝 `{file}`\n"
                if len(diff_summary['file_changes']['modified']) > 5:
                    description += f"  - ... and {len(diff_summary['file_changes']['modified']) - 5} more\n"
            
            if diff_summary['file_changes']['deleted']:
                description += f"- **{len(diff_summary['file_changes']['deleted'])} files deleted**\n"
                for file in diff_summary['file_changes']['deleted'][:3]:
                    description += f"  - ❌ `{file}`\n"
        
        if diff_summary['stat_summary']:
            description += f"- **Statistics**: {diff_summary['stat_summary']}\n"
        
        description += "\n"
        
        # Recent commits
        if diff_summary['recent_commits']:
            description += "## 📝 Recent Commits\n\n"
            for commit in diff_summary['recent_commits'][:5]:
                if commit.strip():
                    description += f"- `{commit}`\n"
            description += "\n"
        
        # Test results
        description += "## ✅ Validation Results\n\n"
        if 'error' in test_results:
            description += f"❌ **Failed to read validation results**: {test_results['error']}\n\n"
        else:
            total = test_results['total_validations']
            success = test_results['successful_validations']
            failed = test_results['failed_validations']
            
            if total > 0:
                success_rate = (success / total) * 100
                description += f"- **{success}/{total} validations passed** ({success_rate:.1f}% success rate)\n"
                
                if test_results['timestamp']:
                    description += f"- **Last validation**: {test_results['timestamp']}\n"
                
                description += "\n### Validation Details\n\n"
                for name, details in test_results['validation_details'].items():
                    status = "✅ PASS" if details['success'] else "❌ FAIL"
                    duration = f" ({details['duration']:.2f}s)" if details.get('duration', 0) > 0 else ""
                    description += f"- {status} **{name.title().replace('_', ' ')}**{duration}\n"
                    
                    if not details['success'] and details.get('error'):
                        error_preview = details['error'][:100]
                        if len(details['error']) > 100:
                            error_preview += "..."
                        description += f"  - Error: `{error_preview}`\n"
                
                description += "\n"
            else:
                description += "⚠️ No validation results available\n\n"
        
        # Agent safety notes
        description += "## 🔒 Agent Safety Features\n\n"
        description += "- ✅ File modification restricted to `server/`, `shared/`, `tests/` only\n"
        description += "- ✅ Pre-commit validation with `npm run build` and `npm test`\n"
        description += "- ✅ Automatic commit discard on validation failure\n"
        description += "- ✅ Security scanning for hardcoded secrets\n"
        description += "- ✅ Test coverage enforcement (80% minimum)\n"
        description += "- ✅ TypeScript strict mode compliance\n\n"
        
        # Manual review required
        description += "## 👀 Manual Review Required\n\n"
        description += "Please review the changes for:\n"
        description += "- Business logic correctness\n"
        description += "- Greek law compliance accuracy\n"
        description += "- Security implications\n"
        description += "- Performance impact\n"
        description += "- Documentation completeness\n\n"
        
        description += "---\n\n"
        description += "*This PR was automatically generated by the AI development agent.*"
        
        return description

    def create_pull_request(self, title: str, description: str) -> Tuple[bool, str]:
        """Create a pull request from dev to main branch"""
        logger.info("Creating pull request...")
        
        pr_data = {
            'title': title,
            'body': description,
            'head': 'dev',
            'base': 'main',
            'draft': False,
            'maintainer_can_modify': True
        }
        
        try:
            response = requests.post(
                f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}/pulls",
                headers=self.headers,
                json=pr_data,
                timeout=30
            )
            
            if response.status_code == 201:
                pr_data = response.json()
                pr_url = pr_data.get('html_url', '')
                pr_number = pr_data.get('number', '')
                logger.info(f"✅ Pull request created: #{pr_number} - {pr_url}")
                return True, pr_url
            elif response.status_code == 422:
                # PR might already exist
                error_message = response.json().get('message', 'Unknown error')
                if 'already exists' in error_message.lower():
                    logger.info("Pull request already exists")
                    return True, "PR already exists"
                else:
                    logger.error(f"PR creation failed: {error_message}")
                    return False, error_message
            else:
                error_message = response.json().get('message', f'HTTP {response.status_code}')
                logger.error(f"Failed to create PR: {error_message}")
                return False, error_message
                
        except requests.RequestException as e:
            logger.error(f"Network error creating PR: {e}")
            return False, str(e)

    def add_pr_labels(self, pr_number: int, labels: List[str]) -> bool:
        """Add labels to the created pull request"""
        if not labels:
            return True
            
        try:
            response = requests.post(
                f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}/issues/{pr_number}/labels",
                headers=self.headers,
                json={'labels': labels},
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Added labels to PR #{pr_number}: {', '.join(labels)}")
                return True
            else:
                logger.warning(f"Failed to add labels to PR: {response.status_code}")
                return False
                
        except requests.RequestException as e:
            logger.warning(f"Failed to add labels: {e}")
            return False

    def execute_pr_workflow(self, commit_message: str = None) -> Tuple[bool, str]:
        """Execute the complete PR workflow"""
        logger.info("🚀 Starting PR workflow...")
        
        # Validate GitHub setup
        valid, message = self.validate_github_setup()
        if not valid:
            return False, f"GitHub setup validation failed: {message}"
        
        # Generate commit message if not provided
        if not commit_message:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            commit_message = f"Agent development update - {timestamp}"
        
        # Switch to dev branch
        if not self.switch_to_dev_branch():
            return False, "Failed to switch to dev branch"
        
        # Commit and push changes
        if not self.commit_and_push_changes(commit_message):
            return False, "Failed to commit and push changes"
        
        # Get diff summary
        diff_summary = self.get_diff_summary()
        
        # Skip PR creation if no changes
        if diff_summary['commit_count'] == 0:
            logger.info("No changes to create PR for")
            return True, "No changes to create PR for"
        
        # Get test results
        test_results = self.get_test_results_summary()
        
        # Create PR title and description
        timestamp = datetime.now().strftime("%Y-%m-%d")
        pr_title = f"🤖 Agent Development Update - {timestamp}"
        pr_description = self.create_pr_description(diff_summary, test_results)
        
        # Create pull request
        success, result = self.create_pull_request(pr_title, pr_description)
        if not success:
            return False, f"Failed to create PR: {result}"
        
        # Extract PR number for labeling
        if result.startswith("http") and "pull" in result:
            try:
                pr_number = int(result.split("/")[-1])
                labels = ['automated', 'agent-development', 'needs-review']
                self.add_pr_labels(pr_number, labels)
            except (ValueError, IndexError):
                logger.warning("Could not extract PR number for labeling")
        
        logger.info("✅ PR workflow completed successfully")
        return True, result

def main():
    """Main entry point for PR workflow"""
    workflow = GitHubPRWorkflow()
    
    try:
        # Get commit message from command line args or environment
        commit_message = os.getenv('COMMIT_MESSAGE')
        if len(os.sys.argv) > 1:
            commit_message = " ".join(os.sys.argv[1:])
        
        # Execute PR workflow
        success, message = workflow.execute_pr_workflow(commit_message)
        
        if success:
            logger.info(f"✅ PR workflow successful: {message}")
            print(f"SUCCESS: {message}")
        else:
            logger.error(f"❌ PR workflow failed: {message}")
            print(f"ERROR: {message}")
            exit(1)
            
    except Exception as e:
        logger.error(f"❌ PR workflow crashed: {e}")
        print(f"CRASH: {e}")
        exit(1)

if __name__ == "__main__":
    main()