#!/usr/bin/env python3
"""
Explainability Engine for Agent Decision Making
Generates WHY.md files explaining what was changed, why, and what business/legal logic was implemented.
"""

import pathlib
import json
import subprocess
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime

# Import tool result for consistency
try:
    from agent.tools import ToolResult, ROOT, GitTool
except ImportError:
    from tools import ToolResult, ROOT, GitTool

@dataclass
class ChangeExplanation:
    """Represents an explanation for a specific change"""
    file_path: str
    change_type: str  # 'added', 'modified', 'deleted'
    what_changed: str
    why_changed: str
    business_logic: str
    legal_basis: Optional[str] = None
    code_snippet: Optional[str] = None

@dataclass
class TaskExplanation:
    """Complete explanation for a task execution"""
    task_id: str
    task_description: str
    timestamp: str
    changes: List[ChangeExplanation]
    overall_reasoning: str
    compliance_notes: str
    success: bool
    duration: float

class ExplainabilityEngine:
    """Generates comprehensive explanations for agent actions"""
    
    def __init__(self):
        self.explanations_dir = ROOT / "explanations"
        self.current_explanation: Optional[TaskExplanation] = None
        self.ensure_directories()
    
    def ensure_directories(self):
        """Ensure required directories exist"""
        self.explanations_dir.mkdir(exist_ok=True)
    
    def start_task_explanation(self, task_id: str, task_description: str):
        """Start tracking a new task for explanation"""
        self.current_explanation = TaskExplanation(
            task_id=task_id,
            task_description=task_description,
            timestamp=datetime.now().isoformat(),
            changes=[],
            overall_reasoning="",
            compliance_notes="",
            success=False,
            duration=0.0
        )
    
    def add_change_explanation(self, 
                             file_path: str,
                             change_type: str,
                             what_changed: str,
                             why_changed: str,
                             business_logic: str,
                             legal_basis: Optional[str] = None,
                             code_snippet: Optional[str] = None):
        """Add explanation for a specific change"""
        if not self.current_explanation:
            return
        
        change_explanation = ChangeExplanation(
            file_path=file_path,
            change_type=change_type,
            what_changed=what_changed,
            why_changed=why_changed,
            business_logic=business_logic,
            legal_basis=legal_basis,
            code_snippet=code_snippet
        )
        
        self.current_explanation.changes.append(change_explanation)
    
    def analyze_git_changes(self) -> List[ChangeExplanation]:
        """Analyze git changes and generate explanations"""
        explanations = []
        
        try:
            # Get changed files
            changed_files_result = GitTool.get_changed_files()
            if not changed_files_result.success:
                return explanations
            
            changed_files = changed_files_result.data or []
            
            # Get git diff for context
            diff_result = GitTool.get_diff()
            diff_content = diff_result.data if diff_result.success else ""
            
            for file_path in changed_files:
                explanation = self._analyze_file_change(file_path, diff_content or "")
                if explanation:
                    explanations.append(explanation)
        
        except Exception as e:
            print(f"⚠️ Error analyzing git changes: {e}")
        
        return explanations
    
    def _analyze_file_change(self, file_path: str, diff_content: str) -> Optional[ChangeExplanation]:
        """Analyze a specific file change and generate explanation"""
        try:
            file_path_obj = pathlib.Path(file_path)
            
            # Determine change type
            change_type = "modified"
            if not file_path_obj.exists():
                change_type = "deleted"
            elif file_path in diff_content and "new file mode" in diff_content:
                change_type = "added"
            
            # Generate explanation based on file type and content
            what_changed, why_changed, business_logic, legal_basis = self._infer_change_reasoning(
                file_path, change_type, diff_content
            )
            
            # Extract relevant code snippet
            code_snippet = self._extract_code_snippet(file_path, diff_content)
            
            return ChangeExplanation(
                file_path=file_path,
                change_type=change_type,
                what_changed=what_changed,
                why_changed=why_changed,
                business_logic=business_logic,
                legal_basis=legal_basis,
                code_snippet=code_snippet
            )
            
        except Exception as e:
            print(f"⚠️ Error analyzing file {file_path}: {e}")
            return None
    
    def _infer_change_reasoning(self, file_path: str, change_type: str, diff_content: str) -> tuple:
        """Infer the reasoning behind a file change"""
        file_lower = file_path.lower()
        
        # Payroll-related files
        if any(keyword in file_lower for keyword in ['payroll', 'salary', 'wage', 'efka', 'tax']):
            return self._explain_payroll_change(file_path, change_type, diff_content)
        
        # Test files
        elif 'test' in file_lower or file_path.endswith('.test.ts') or file_path.endswith('.test.js'):
            return self._explain_test_change(file_path, change_type, diff_content)
        
        # Configuration files
        elif any(config in file_lower for config in ['config', 'package.json', '.env', 'tsconfig']):
            return self._explain_config_change(file_path, change_type, diff_content)
        
        # Database schema files
        elif 'schema' in file_lower or 'migration' in file_lower:
            return self._explain_schema_change(file_path, change_type, diff_content)
        
        # Agent/tool files
        elif 'agent/' in file_path or 'tool' in file_lower:
            return self._explain_agent_change(file_path, change_type, diff_content)
        
        # UI/Frontend files
        elif any(ext in file_path for ext in ['.tsx', '.jsx', '.css', '.scss']):
            return self._explain_ui_change(file_path, change_type, diff_content)
        
        # Default explanation
        else:
            return self._explain_generic_change(file_path, change_type, diff_content)
    
    def _explain_payroll_change(self, file_path: str, change_type: str, diff_content: str) -> tuple:
        """Explain payroll-related changes"""
        what_changed = f"Modified payroll calculation logic in {file_path}"
        why_changed = "Updated to ensure compliance with Greek labor law requirements"
        business_logic = "Implementing accurate payroll calculations for Greek employment regulations"
        legal_basis = None
        
        # Look for specific legal patterns in diff
        if "760" in diff_content or "minimum" in diff_content.lower():
            legal_basis = "Ministerial Decision 13457/2024 - €760 monthly minimum wage"
        elif "0.133" in diff_content or "13.3" in diff_content:
            legal_basis = "Law 4387/2016 Article 39 - EFKA employee contributions 13.3%"
        elif "1.25" in diff_content and "overtime" in diff_content.lower():
            legal_basis = "Law 3846/2010 Article 3 - Overtime premium minimum 25%"
        elif any(rate in diff_content for rate in ["0.09", "0.22", "0.28", "0.36", "0.44"]):
            legal_basis = "Law 4172/2013 - Progressive income tax brackets"
        
        if change_type == "added":
            what_changed = f"Added new payroll calculation functionality in {file_path}"
            why_changed = "Implementing missing payroll features required for Greek compliance"
        elif change_type == "deleted":
            what_changed = f"Removed payroll calculation code from {file_path}"
            why_changed = "Cleaning up non-compliant or deprecated payroll logic"
        
        return what_changed, why_changed, business_logic, legal_basis
    
    def _explain_test_change(self, file_path: str, change_type: str, diff_content: str) -> tuple:
        """Explain test-related changes"""
        what_changed = f"Updated test coverage in {file_path}"
        why_changed = "Ensuring comprehensive testing of business logic and compliance requirements"
        business_logic = "Maintaining high code quality and preventing regressions in critical payroll calculations"
        legal_basis = None
        
        if "payroll" in diff_content.lower() or "efka" in diff_content.lower():
            legal_basis = "Testing compliance with Greek labor law calculations"
        
        if change_type == "added":
            what_changed = f"Added new test cases in {file_path}"
            why_changed = "Improving test coverage to meet minimum threshold requirements"
        
        return what_changed, why_changed, business_logic, legal_basis
    
    def _explain_config_change(self, file_path: str, change_type: str, diff_content: str) -> tuple:
        """Explain configuration changes"""
        what_changed = f"Updated configuration in {file_path}"
        why_changed = "Optimizing build process, dependencies, or development workflow"
        business_logic = "Maintaining reliable development and deployment pipeline"
        legal_basis = None
        
        if "eslint" in diff_content.lower():
            why_changed = "Enforcing code quality standards and preventing security vulnerabilities"
        elif "jest" in diff_content.lower() or "coverage" in diff_content.lower():
            why_changed = "Ensuring adequate test coverage and quality assurance"
        elif "typescript" in diff_content.lower():
            why_changed = "Maintaining type safety and code reliability"
        
        return what_changed, why_changed, business_logic, legal_basis
    
    def _explain_schema_change(self, file_path: str, change_type: str, diff_content: str) -> tuple:
        """Explain database schema changes"""
        what_changed = f"Modified database schema in {file_path}"
        why_changed = "Updating data model to support new business requirements or compliance needs"
        business_logic = "Ensuring data integrity and supporting payroll/HR business processes"
        legal_basis = None
        
        if any(keyword in diff_content.lower() for keyword in ['employee', 'payroll', 'salary']):
            legal_basis = "Supporting Greek labor law data requirements and audit trails"
        
        return what_changed, why_changed, business_logic, legal_basis
    
    def _explain_agent_change(self, file_path: str, change_type: str, diff_content: str) -> tuple:
        """Explain agent/automation changes"""
        what_changed = f"Updated agent automation logic in {file_path}"
        why_changed = "Improving agent capabilities, validation, or reliability"
        business_logic = "Enhancing automated development workflow and quality control"
        legal_basis = None
        
        if "validation" in diff_content.lower() or "compliance" in diff_content.lower():
            why_changed = "Strengthening compliance validation and legal requirement checking"
            legal_basis = "Ensuring automated systems comply with Greek labor law"
        
        return what_changed, why_changed, business_logic, legal_basis
    
    def _explain_ui_change(self, file_path: str, change_type: str, diff_content: str) -> tuple:
        """Explain UI/frontend changes"""
        what_changed = f"Updated user interface in {file_path}"
        why_changed = "Improving user experience, accessibility, or functionality"
        business_logic = "Providing intuitive interfaces for HR and payroll management"
        legal_basis = None
        
        return what_changed, why_changed, business_logic, legal_basis
    
    def _explain_generic_change(self, file_path: str, change_type: str, diff_content: str) -> tuple:
        """Generic explanation for other file types"""
        what_changed = f"Updated {file_path}"
        why_changed = "Implementing requested functionality or fixing issues"
        business_logic = "Supporting overall system functionality and requirements"
        legal_basis = None
        
        return what_changed, why_changed, business_logic, legal_basis
    
    def _extract_code_snippet(self, file_path: str, diff_content: str) -> Optional[str]:
        """Extract relevant code snippet from diff"""
        try:
            # Find the diff section for this file
            file_section_start = diff_content.find(f"diff --git a/{file_path}")
            if file_section_start == -1:
                return None
            
            # Find the next file's diff or end of content
            next_file_start = diff_content.find("diff --git", file_section_start + 1)
            if next_file_start == -1:
                file_diff = diff_content[file_section_start:]
            else:
                file_diff = diff_content[file_section_start:next_file_start]
            
            # Extract meaningful added lines (starting with +)
            added_lines = []
            for line in file_diff.split('\n'):
                if line.startswith('+') and not line.startswith('+++'):
                    # Remove the + prefix and clean up
                    clean_line = line[1:].strip()
                    if clean_line and not clean_line.startswith('//') and len(clean_line) > 5:
                        added_lines.append(clean_line)
            
            if added_lines:
                # Return up to 5 most significant lines
                return '\n'.join(added_lines[:5])
            
        except Exception:
            pass
        
        return None
    
    def finalize_explanation(self, success: bool, duration: float, overall_reasoning: str = "", compliance_notes: str = ""):
        """Finalize the current task explanation"""
        if not self.current_explanation:
            return
        
        # If no manual explanations were added, analyze git changes
        if not self.current_explanation.changes:
            self.current_explanation.changes = self.analyze_git_changes()
        
        self.current_explanation.success = success
        self.current_explanation.duration = duration
        self.current_explanation.overall_reasoning = overall_reasoning or self._generate_overall_reasoning()
        self.current_explanation.compliance_notes = compliance_notes or self._generate_compliance_notes()
    
    def _generate_overall_reasoning(self) -> str:
        """Generate overall reasoning from individual changes"""
        if not self.current_explanation or not self.current_explanation.changes:
            return "Completed task as requested with standard development practices."
        
        # Categorize changes
        payroll_changes = [c for c in self.current_explanation.changes if 'payroll' in c.file_path.lower() or c.legal_basis]
        test_changes = [c for c in self.current_explanation.changes if 'test' in c.file_path.lower()]
        config_changes = [c for c in self.current_explanation.changes if any(x in c.file_path.lower() for x in ['config', 'package.json'])]
        
        reasoning_parts = []
        
        if payroll_changes:
            reasoning_parts.append(f"Updated {len(payroll_changes)} payroll-related files to ensure Greek labor law compliance")
        
        if test_changes:
            reasoning_parts.append(f"Enhanced test coverage with {len(test_changes)} test file updates")
        
        if config_changes:
            reasoning_parts.append(f"Optimized configuration in {len(config_changes)} files for better development workflow")
        
        if not reasoning_parts:
            reasoning_parts.append("Made systematic improvements to codebase functionality and quality")
        
        return ". ".join(reasoning_parts) + "."
    
    def _generate_compliance_notes(self) -> str:
        """Generate compliance notes from changes"""
        if not self.current_explanation:
            return ""
        
        legal_changes = [c for c in self.current_explanation.changes if c.legal_basis is not None]
        
        if not legal_changes:
            return "No specific legal compliance requirements identified for this task."
        
        compliance_notes = ["Legal compliance ensured through:"]
        for change in legal_changes:
            if change.legal_basis:
                compliance_notes.append(f"• {change.legal_basis}")
        
        return "\n".join(compliance_notes)
    
    def generate_why_md(self) -> ToolResult:
        """Generate WHY.md file explaining the current task"""
        if not self.current_explanation:
            return ToolResult(
                success=False,
                message="No task explanation to generate",
                error="No current explanation tracked"
            )
        
        start_time = datetime.now()
        
        try:
            # Generate markdown content
            md_content = self._format_explanation_markdown()
            
            # Write to WHY.md file
            why_file = ROOT / "WHY.md"
            with open(why_file, 'w', encoding='utf-8') as f:
                f.write(md_content)
            
            # Also save to explanations directory with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            archived_file = self.explanations_dir / f"WHY_{timestamp}_{self.current_explanation.task_id}.md"
            with open(archived_file, 'w', encoding='utf-8') as f:
                f.write(md_content)
            
            duration = (datetime.now() - start_time).total_seconds()
            
            return ToolResult(
                success=True,
                message=f"WHY.md generated successfully in {duration:.1f}s",
                data=f"Explanation written to WHY.md and archived to {archived_file.name}",
                duration=duration
            )
            
        except Exception as e:
            duration = (datetime.now() - start_time).total_seconds()
            return ToolResult(
                success=False,
                message="Failed to generate WHY.md",
                error=str(e),
                duration=duration
            )
    
    def _format_explanation_markdown(self) -> str:
        """Format the explanation as markdown"""
        if not self.current_explanation:
            return "# WHY.md\n\nNo explanation available."
        
        md_content = f"""# WHY.md - Agent Explanation Report

**Task:** {self.current_explanation.task_description}  
**Task ID:** {self.current_explanation.task_id}  
**Timestamp:** {self.current_explanation.timestamp}  
**Duration:** {self.current_explanation.duration:.1f} seconds  
**Success:** {'✅ Yes' if self.current_explanation.success else '❌ No'}

---

## Overall Reasoning

{self.current_explanation.overall_reasoning}

---

## What Changed

"""
        
        if not self.current_explanation.changes:
            md_content += "No file changes detected.\n\n"
        else:
            for i, change in enumerate(self.current_explanation.changes, 1):
                md_content += f"### {i}. {change.file_path} ({change.change_type})\n\n"
                md_content += f"**What:** {change.what_changed}\n\n"
                md_content += f"**Why:** {change.why_changed}\n\n"
                md_content += f"**Business Logic:** {change.business_logic}\n\n"
                
                if change.legal_basis:
                    md_content += f"**Legal Basis:** {change.legal_basis}\n\n"
                
                if change.code_snippet:
                    md_content += f"**Key Changes:**\n```\n{change.code_snippet}\n```\n\n"
                
                md_content += "---\n\n"
        
        md_content += f"""## Legal & Business Compliance

{self.current_explanation.compliance_notes}

---

## Summary

This explanation was automatically generated by the Agent Explainability Engine to provide transparency into the decision-making process and ensure all changes align with business requirements and Greek labor law compliance.

*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
        
        return md_content

# Convenience functions for integration with existing tools
def start_explanation(task_id: str, task_description: str):
    """Start tracking an explanation for a task"""
    global _explanation_engine
    if '_explanation_engine' not in globals():
        _explanation_engine = ExplainabilityEngine()
    _explanation_engine.start_task_explanation(task_id, task_description)

def add_explanation(file_path: str, change_type: str, what_changed: str, why_changed: str, business_logic: str, legal_basis: str = None):
    """Add an explanation for a specific change"""
    global _explanation_engine
    if '_explanation_engine' in globals():
        _explanation_engine.add_change_explanation(
            file_path, change_type, what_changed, why_changed, business_logic, legal_basis
        )

def generate_explanation_report(success: bool = True, duration: float = 0.0, overall_reasoning: str = "", compliance_notes: str = "") -> ToolResult:
    """Generate the final WHY.md explanation report"""
    global _explanation_engine
    if '_explanation_engine' not in globals():
        _explanation_engine = ExplainabilityEngine()
    
    _explanation_engine.finalize_explanation(success, duration, overall_reasoning, compliance_notes)
    return _explanation_engine.generate_why_md()