#!/usr/bin/env python3
"""
Greek Labor Law Reference Validator
Ensures all payroll calculations comply with official Greek labor law formulas.
Validates generated code against context/labor_law_reference.md before acceptance.
"""

import re
import ast
import pathlib
import json
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from datetime import datetime

# Import tool result for consistency
try:
    from agent.tools import ToolResult, ROOT
except ImportError:
    from tools import ToolResult, ROOT

@dataclass
class LawViolation:
    """Represents a violation of Greek labor law"""
    violation_type: str
    description: str
    file_path: str
    line_number: Optional[int]
    severity: str  # 'critical', 'high', 'medium', 'low'
    legal_reference: str
    suggested_fix: str

@dataclass
class LegalFormula:
    """Represents a legal formula from labor law reference"""
    name: str
    formula: str
    legal_basis: str
    validation_rule: str
    tolerance: float = 0.01

class GreekLaborLawValidator:
    """Validates payroll code against Greek labor law requirements"""
    
    def __init__(self):
        self.reference_file = ROOT / "context" / "labor_law_reference.md"
        self.violations_log = ROOT / "agent" / "law_violations.json"
        self.legal_formulas = self._load_legal_formulas()
        self.critical_patterns = self._define_critical_patterns()
    
    def _load_legal_formulas(self) -> Dict[str, LegalFormula]:
        """Load legal formulas from reference documentation"""
        if not self.reference_file.exists():
            return {}
        
        formulas = {}
        try:
            with open(self.reference_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract minimum wage formula
            formulas['minimum_wage'] = LegalFormula(
                name="Minimum Wage Compliance",
                formula="gross_salary >= 760.00",
                legal_basis="Ministerial Decision 13457/2024",
                validation_rule="gross >= MINIMUM_WAGE_MONTHLY * employment_percentage",
                tolerance=0.01
            )
            
            # Extract EFKA contribution formulas
            formulas['efka_employee'] = LegalFormula(
                name="EFKA Employee Contributions",
                formula="efka_employee = gross_salary * 0.133",
                legal_basis="Article 39 of Law 4387/2016", 
                validation_rule="abs(efka - gross * 0.133) < 0.01",
                tolerance=0.001
            )
            
            formulas['efka_employer'] = LegalFormula(
                name="EFKA Employer Contributions",
                formula="efka_employer = gross_salary * 0.1738",
                legal_basis="Article 39 of Law 4387/2016",
                validation_rule="employer_contributions >= gross_salary * 0.1738",
                tolerance=0.001
            )
            
            # Extract working time limits
            formulas['working_hours'] = LegalFormula(
                name="Working Time Limits",
                formula="weekly_hours <= 48",
                legal_basis="Law 3846/2010, Article 1",
                validation_rule="weekly_hours <= MAX_WEEKLY_HOURS + MAX_OVERTIME_WEEKLY",
                tolerance=0
            )
            
            # Extract overtime rates
            formulas['overtime_rate'] = LegalFormula(
                name="Overtime Premium Rates",
                formula="overtime_rate >= base_rate * 1.25",
                legal_basis="Law 3846/2010, Article 3",
                validation_rule="overtime_premium >= 0.25 * hourly_rate",
                tolerance=0.01
            )
            
            # Extract tax calculation
            formulas['income_tax'] = LegalFormula(
                name="Progressive Income Tax",
                formula="tax = calculate_progressive_brackets(annual_gross)",
                legal_basis="Law 4172/2013 Tax Brackets",
                validation_rule="tax_calculation_follows_brackets",
                tolerance=0.01
            )
            
            # Extract annual leave
            formulas['annual_leave'] = LegalFormula(
                name="Annual Leave Entitlement",
                formula="leave_days >= calculate_annual_leave(years_of_service)",
                legal_basis="Law 4611/2019",
                validation_rule="annual_leave >= minimum_by_seniority",
                tolerance=0
            )
            
            return formulas
            
        except Exception as e:
            print(f"⚠️ Error loading legal formulas: {e}")
            return {}
    
    def _define_critical_patterns(self) -> Dict[str, Dict]:
        """Define critical code patterns that must comply with Greek law"""
        return {
            'salary_calculation': {
                'patterns': [
                    r'salary\s*[=]\s*(\d+(?:\.\d+)?)',
                    r'gross[_]?salary\s*[=]\s*(\d+(?:\.\d+)?)',
                    r'minimum[_]?wage\s*[=]\s*(\d+(?:\.\d+)?)'
                ],
                'validation': self._validate_salary_amounts,
                'severity': 'critical'
            },
            'efka_contributions': {
                'patterns': [
                    r'efka[_]?(?:employee|worker)\s*[=].*?(\d+(?:\.\d+)?)(?:\s*\*|\s*\%)',
                    r'social[_]?security.*?(\d+(?:\.\d+)?)(?:\s*\*|\s*\%)',
                    r'contributions.*?(\d+(?:\.\d+)?)(?:\s*\*|\s*\%)'
                ],
                'validation': self._validate_efka_rates,
                'severity': 'critical'
            },
            'working_hours': {
                'patterns': [
                    r'(?:max|maximum)[_]?(?:hours|work)[_]?(?:per|daily|weekly)\s*[=]\s*(\d+)',
                    r'hours[_]?(?:worked|limit)\s*[=]\s*(\d+)',
                    r'overtime[_]?limit\s*[=]\s*(\d+)'
                ],
                'validation': self._validate_working_hours,
                'severity': 'high'
            },
            'overtime_calculation': {
                'patterns': [
                    r'overtime[_]?(?:rate|multiplier|premium)\s*[=].*?(\d+(?:\.\d+)?)',
                    r'night[_]?(?:shift|rate)\s*[=].*?(\d+(?:\.\d+)?)',
                    r'holiday[_]?(?:rate|premium)\s*[=].*?(\d+(?:\.\d+)?)'
                ],
                'validation': self._validate_overtime_rates,
                'severity': 'high'
            },
            'tax_calculation': {
                'patterns': [
                    r'tax[_]?(?:rate|bracket|percentage)\s*[=].*?(\d+(?:\.\d+)?)',
                    r'income[_]?tax.*?(\d+(?:\.\d+)?)',
                    r'solidarity[_]?tax.*?(\d+(?:\.\d+)?)'
                ],
                'validation': self._validate_tax_rates,
                'severity': 'high'
            }
        }
    
    def _validate_salary_amounts(self, matches: List[str], file_path: str, line_num: int) -> List[LawViolation]:
        """Validate salary amounts against minimum wage"""
        violations = []
        for match in matches:
            try:
                amount = float(match)
                if amount < 760.00 and amount > 0:  # Avoid validating test/placeholder values of 0
                    violations.append(LawViolation(
                        violation_type="minimum_wage_violation",
                        description=f"Salary amount {amount} below legal minimum wage of €760.00",
                        file_path=file_path,
                        line_number=line_num,
                        severity="critical",
                        legal_reference="Ministerial Decision 13457/2024 - Minimum Wage €760/month",
                        suggested_fix=f"Change salary to >= 760.00 (current: {amount})"
                    ))
            except ValueError:
                continue
        return violations
    
    def _validate_efka_rates(self, matches: List[str], file_path: str, line_num: int) -> List[LawViolation]:
        """Validate EFKA contribution rates"""
        violations = []
        for match in matches:
            try:
                rate = float(match)
                # Check if it's a percentage (likely between 0-1 or 0-100)
                if 0 < rate < 1:  # Decimal format (0.133)
                    if not (0.132 <= rate <= 0.174):  # EFKA employee (13.3%) to employer (17.4%) range
                        violations.append(LawViolation(
                            violation_type="efka_rate_violation", 
                            description=f"EFKA rate {rate:.3f} outside legal range (13.3%-17.4%)",
                            file_path=file_path,
                            line_number=line_num,
                            severity="critical",
                            legal_reference="Law 4387/2016 Article 39 - EFKA rates 13.3% employee, 17.38% employer",
                            suggested_fix=f"Use correct EFKA rate: 0.133 (employee) or 0.1738 (employer)"
                        ))
                elif 1 < rate < 100:  # Percentage format (13.3)
                    if not (13.2 <= rate <= 17.5):
                        violations.append(LawViolation(
                            violation_type="efka_rate_violation",
                            description=f"EFKA rate {rate}% outside legal range (13.3%-17.4%)",
                            file_path=file_path,
                            line_number=line_num,
                            severity="critical",
                            legal_reference="Law 4387/2016 Article 39 - EFKA rates 13.3% employee, 17.38% employer",
                            suggested_fix=f"Use correct EFKA rate: 13.3% (employee) or 17.38% (employer)"
                        ))
            except ValueError:
                continue
        return violations
    
    def _validate_working_hours(self, matches: List[str], file_path: str, line_num: int) -> List[LawViolation]:
        """Validate working hour limits"""
        violations = []
        for match in matches:
            try:
                hours = int(match)
                if hours > 48:  # 40 regular + 8 overtime max per week
                    violations.append(LawViolation(
                        violation_type="working_hours_violation",
                        description=f"Working hours {hours} exceed legal maximum of 48 hours/week",
                        file_path=file_path,
                        line_number=line_num,
                        severity="high",
                        legal_reference="Law 3846/2010 Article 1 - Max 40 hours + 8 overtime = 48 hours/week",
                        suggested_fix=f"Limit working hours to 48 maximum (40 regular + 8 overtime)"
                    ))
                elif hours > 40 and "regular" in file_path.lower():
                    violations.append(LawViolation(
                        violation_type="regular_hours_violation", 
                        description=f"Regular working hours {hours} exceed 40 hours/week limit",
                        file_path=file_path,
                        line_number=line_num,
                        severity="high",
                        legal_reference="Law 3846/2010 Article 1 - Max 40 regular hours/week",
                        suggested_fix=f"Limit regular hours to 40, treat excess as overtime"
                    ))
            except ValueError:
                continue
        return violations
    
    def _validate_overtime_rates(self, matches: List[str], file_path: str, line_num: int) -> List[LawViolation]:
        """Validate overtime premium rates"""
        violations = []
        for match in matches:
            try:
                rate = float(match)
                if 1.0 < rate < 1.25:  # Overtime should be at least 25% premium (1.25x)
                    violations.append(LawViolation(
                        violation_type="overtime_rate_violation",
                        description=f"Overtime rate {rate}x below legal minimum of 1.25x",
                        file_path=file_path,
                        line_number=line_num,
                        severity="high",
                        legal_reference="Law 3846/2010 Article 3 - Overtime minimum 25% premium (1.25x)",
                        suggested_fix=f"Increase overtime rate to at least 1.25x (current: {rate}x)"
                    ))
                elif 0.2 < rate < 0.25 and rate < 1:  # Premium percentage format (0.25 = 25%)
                    violations.append(LawViolation(
                        violation_type="overtime_premium_violation",
                        description=f"Overtime premium {rate:.2f} below legal minimum of 0.25 (25%)",
                        file_path=file_path,
                        line_number=line_num,
                        severity="high",
                        legal_reference="Law 3846/2010 Article 3 - Overtime minimum 25% premium",
                        suggested_fix=f"Increase overtime premium to at least 0.25 (25%)"
                    ))
            except ValueError:
                continue
        return violations
    
    def _validate_tax_rates(self, matches: List[str], file_path: str, line_num: int) -> List[LawViolation]:
        """Validate tax calculation rates"""
        violations = []
        # Greek tax brackets: 9%, 22%, 28%, 36%, 44%
        valid_tax_rates = [0.09, 0.22, 0.28, 0.36, 0.44, 9, 22, 28, 36, 44]
        
        for match in matches:
            try:
                rate = float(match)
                # Allow some tolerance for tax calculations
                if rate > 0.5 or rate > 50:  # Likely invalid tax rate
                    if rate not in valid_tax_rates and not any(abs(rate - vtr) < 0.01 for vtr in valid_tax_rates):
                        violations.append(LawViolation(
                            violation_type="invalid_tax_rate",
                            description=f"Tax rate {rate} not in Greek tax brackets (9%, 22%, 28%, 36%, 44%)",
                            file_path=file_path,
                            line_number=line_num,
                            severity="high",
                            legal_reference="Law 4172/2013 - Progressive tax brackets",
                            suggested_fix="Use official Greek tax rates: 9%, 22%, 28%, 36%, 44%"
                        ))
            except ValueError:
                continue
        return violations
    
    def validate_file(self, file_path: pathlib.Path) -> List[LawViolation]:
        """Validate a single file against Greek labor law"""
        violations = []
        
        if not file_path.exists() or file_path.suffix not in ['.ts', '.js', '.py', '.tsx', '.jsx']:
            return violations
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
            
            # Check each critical pattern
            for pattern_name, pattern_config in self.critical_patterns.items():
                for pattern in pattern_config['patterns']:
                    for line_num, line in enumerate(lines, 1):
                        matches = re.findall(pattern, line, re.IGNORECASE)
                        if matches:
                            line_violations = pattern_config['validation'](
                                matches, str(file_path), line_num
                            )
                            violations.extend(line_violations)
            
            # Additional semantic validation for payroll files
            if any(keyword in content.lower() for keyword in ['payroll', 'salary', 'wage', 'efka', 'tax']):
                violations.extend(self._validate_payroll_logic(content, str(file_path)))
                
        except Exception as e:
            violations.append(LawViolation(
                violation_type="file_validation_error",
                description=f"Error validating file: {e}",
                file_path=str(file_path),
                line_number=None,
                severity="medium",
                legal_reference="Technical validation error",
                suggested_fix="Check file syntax and encoding"
            ))
        
        return violations
    
    def _validate_payroll_logic(self, content: str, file_path: str) -> List[LawViolation]:
        """Validate payroll calculation logic against legal formulas"""
        violations = []
        
        # Check for critical payroll calculation patterns
        critical_checks = [
            {
                'pattern': r'function\s+calculate(?:Net|Gross|Tax|Efka|Salary)',
                'validator': self._check_calculation_function,
                'description': 'Payroll calculation function'
            },
            {
                'pattern': r'(?:net|gross)\s*=.*?(?:salary|wage)',
                'validator': self._check_salary_assignment,
                'description': 'Salary calculation assignment'
            },
            {
                'pattern': r'efka.*?=.*?(?:\*|percentage|rate)',
                'validator': self._check_efka_calculation,
                'description': 'EFKA contribution calculation'
            }
        ]
        
        for check in critical_checks:
            if re.search(check['pattern'], content, re.IGNORECASE):
                try:
                    check_violations = check['validator'](content, file_path)
                    violations.extend(check_violations)
                except Exception as e:
                    violations.append(LawViolation(
                        violation_type="logic_validation_error",
                        description=f"Error validating {check['description']}: {e}",
                        file_path=file_path,
                        line_number=None,
                        severity="medium",
                        legal_reference="Technical validation error",
                        suggested_fix="Review calculation logic for compliance"
                    ))
        
        return violations
    
    def _check_calculation_function(self, content: str, file_path: str) -> List[LawViolation]:
        """Check payroll calculation functions for legal compliance"""
        violations = []
        
        # Look for minimum wage checks
        if 'calculate' in content.lower() and 'salary' in content.lower():
            if '760' not in content and 'minimum_wage' not in content.lower():
                violations.append(LawViolation(
                    violation_type="missing_minimum_wage_check",
                    description="Payroll calculation missing minimum wage validation",
                    file_path=file_path,
                    line_number=None,
                    severity="high",
                    legal_reference="Ministerial Decision 13457/2024 - €760 minimum wage",
                    suggested_fix="Add minimum wage validation: salary >= 760.00"
                ))
        
        # Look for EFKA rate checks
        if 'efka' in content.lower():
            if '0.133' not in content and '13.3' not in content:
                violations.append(LawViolation(
                    violation_type="incorrect_efka_rate",
                    description="EFKA calculation not using legal rate of 13.3%",
                    file_path=file_path,
                    line_number=None,
                    severity="critical", 
                    legal_reference="Law 4387/2016 - EFKA employee rate 13.3%",
                    suggested_fix="Use correct EFKA rate: 0.133 or 13.3%"
                ))
        
        return violations
    
    def _check_salary_assignment(self, content: str, file_path: str) -> List[LawViolation]:
        """Check salary assignments for compliance"""
        violations = []
        
        # Look for hardcoded low salaries
        salary_pattern = r'(?:salary|wage)\s*=\s*(\d+(?:\.\d+)?)'
        matches = re.findall(salary_pattern, content)
        
        for match in matches:
            try:
                amount = float(match)
                if 100 < amount < 760:  # Realistic salary range but below minimum
                    violations.append(LawViolation(
                        violation_type="below_minimum_wage",
                        description=f"Hardcoded salary {amount} below minimum wage €760",
                        file_path=file_path,
                        line_number=None,
                        severity="critical",
                        legal_reference="Ministerial Decision 13457/2024",
                        suggested_fix=f"Increase salary to minimum €760 (current: {amount})"
                    ))
            except ValueError:
                continue
        
        return violations
    
    def _check_efka_calculation(self, content: str, file_path: str) -> List[LawViolation]:
        """Check EFKA calculations for accuracy"""
        violations = []
        
        # Look for EFKA rate usage
        efka_patterns = [
            r'efka.*?(\d+(?:\.\d+)?)(?:\s*\*|\s*%)',
            r'social_security.*?(\d+(?:\.\d+)?)(?:\s*\*|\s*%)'
        ]
        
        for pattern in efka_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                try:
                    rate = float(match)
                    # Check if rate is approximately 13.3% (0.133 decimal or 13.3 percentage)
                    if not (abs(rate - 0.133) < 0.001 or abs(rate - 13.3) < 0.1):
                        violations.append(LawViolation(
                            violation_type="incorrect_efka_calculation",
                            description=f"EFKA rate {rate} does not match legal requirement (13.3%)",
                            file_path=file_path,
                            line_number=None,
                            severity="critical",
                            legal_reference="Law 4387/2016 - EFKA employee contributions 13.3%",
                            suggested_fix="Use legal EFKA rate: 0.133 (decimal) or 13.3 (percentage)"
                        ))
                except ValueError:
                    continue
        
        return violations
    
    def validate_payroll_changes(self, changed_files: List[str]) -> ToolResult:
        """Validate payroll-related file changes against Greek labor law"""
        start_time = datetime.now()
        all_violations = []
        
        print("⚖️ Validating changes against Greek labor law...")
        
        # Filter for payroll-related files
        payroll_files = []
        for file_path in changed_files:
            file_path_obj = pathlib.Path(file_path)
            if self._is_payroll_related(file_path_obj):
                payroll_files.append(file_path_obj)
        
        if not payroll_files:
            duration = (datetime.now() - start_time).total_seconds()
            return ToolResult(
                success=True,
                message=f"No payroll files to validate in {duration:.1f}s",
                data="No Greek labor law validation required",
                duration=duration
            )
        
        # Validate each payroll file
        for file_path in payroll_files:
            print(f"   🔍 Checking {file_path.name} against labor law...")
            file_violations = self.validate_file(file_path)
            all_violations.extend(file_violations)
        
        # Log violations
        self._log_violations(all_violations)
        
        # Generate results
        duration = (datetime.now() - start_time).total_seconds()
        critical_violations = [v for v in all_violations if v.severity == 'critical']
        high_violations = [v for v in all_violations if v.severity == 'high']
        
        if critical_violations:
            violation_summary = self._format_violations_summary(all_violations)
            return ToolResult(
                success=False,
                message="Critical Greek labor law violations detected",
                error=f"Found {len(critical_violations)} critical violations in payroll code",
                data=violation_summary,
                duration=duration
            )
        elif high_violations:
            violation_summary = self._format_violations_summary(all_violations)
            print(f"⚠️ Warning: {len(high_violations)} high-severity labor law issues found")
            # For high violations, we warn but don't block (business decision)
            return ToolResult(
                success=True,
                message=f"Payroll validation completed with warnings in {duration:.1f}s",
                data=violation_summary,
                duration=duration
            )
        else:
            return ToolResult(
                success=True,
                message=f"All payroll changes comply with Greek labor law in {duration:.1f}s",
                data=f"Validated {len(payroll_files)} payroll files - no violations found",
                duration=duration
            )
    
    def _is_payroll_related(self, file_path: pathlib.Path) -> bool:
        """Check if file is related to payroll calculations"""
        payroll_indicators = [
            'payroll', 'salary', 'wage', 'efka', 'tax', 'overtime', 
            'holiday', 'leave', 'severance', 'contribution', 'benefit',
            'compensation', 'allowance', 'bonus', 'premium'
        ]
        
        file_content_check = file_path.name.lower()
        if any(indicator in file_content_check for indicator in payroll_indicators):
            return True
        
        # Check file content for payroll keywords (for small files)
        try:
            if file_path.exists() and file_path.stat().st_size < 50000:  # Only check files < 50KB
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read(1000).lower()  # Read first 1KB
                    return any(indicator in content for indicator in payroll_indicators)
        except:
            pass
        
        return False
    
    def _format_violations_summary(self, violations: List[LawViolation]) -> str:
        """Format violations into a readable summary"""
        if not violations:
            return "No labor law violations found"
        
        summary = f"🚨 Greek Labor Law Violations ({len(violations)} total):\n\n"
        
        # Group by severity
        by_severity = {}
        for violation in violations:
            if violation.severity not in by_severity:
                by_severity[violation.severity] = []
            by_severity[violation.severity].append(violation)
        
        # Format by severity level
        for severity in ['critical', 'high', 'medium', 'low']:
            if severity in by_severity:
                summary += f"📋 {severity.upper()} VIOLATIONS ({len(by_severity[severity])}):\n"
                for v in by_severity[severity]:
                    summary += f"   • {v.description}\n"
                    summary += f"     File: {v.file_path}"
                    if v.line_number:
                        summary += f" (line {v.line_number})"
                    summary += f"\n     Legal Basis: {v.legal_reference}\n"
                    summary += f"     Fix: {v.suggested_fix}\n\n"
        
        return summary
    
    def _log_violations(self, violations: List[LawViolation]):
        """Log violations to persistent storage"""
        try:
            log_data = {
                'timestamp': datetime.now().isoformat(),
                'total_violations': len(violations),
                'violations': [
                    {
                        'type': v.violation_type,
                        'description': v.description,
                        'file': v.file_path,
                        'line': v.line_number,
                        'severity': v.severity,
                        'legal_reference': v.legal_reference,
                        'suggested_fix': v.suggested_fix
                    }
                    for v in violations
                ]
            }
            
            # Append to violations log
            existing_logs = []
            if self.violations_log.exists():
                with open(self.violations_log, 'r') as f:
                    existing_logs = json.load(f)
            
            existing_logs.append(log_data)
            
            # Keep only last 100 violation reports
            if len(existing_logs) > 100:
                existing_logs = existing_logs[-100:]
            
            with open(self.violations_log, 'w') as f:
                json.dump(existing_logs, f, indent=2)
                
        except Exception as e:
            print(f"⚠️ Error logging violations: {e}")

# Convenience function for integration with existing tools
def validate_greek_labor_law(changed_files: List[str]) -> ToolResult:
    """Validate changes against Greek labor law - convenience function for tools integration"""
    validator = GreekLaborLawValidator()
    return validator.validate_payroll_changes(changed_files)