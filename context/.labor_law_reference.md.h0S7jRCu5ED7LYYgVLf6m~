# Greek Labor Law Reference
## Comprehensive Payroll Calculation Formulas & Legal Clauses

*Last Updated: January 2025*
*Legal Framework: Greek Labor Code, EFKA Regulations, Tax Code*

---

## 1. BASIC SALARY CALCULATIONS

### 1.1 Minimum Wage (Law 4046/2012, updated 2024)
```
MINIMUM_WAGE_MONTHLY = €760.00 (gross, full-time)
MINIMUM_WAGE_DAILY = €25.33 (monthly / 30 days)
MINIMUM_WAGE_HOURLY = €3.79 (daily / 6.67 hours)
```

**Legal Basis:** Ministerial Decision 13457/2024
**Effective Date:** April 1, 2024
**Formula:** `gross_salary >= MINIMUM_WAGE_MONTHLY * employment_percentage`

### 1.2 Working Time Limits (Law 3846/2010)
```
MAX_WEEKLY_HOURS = 40 hours
MAX_DAILY_HOURS = 8 hours
MAX_OVERTIME_WEEKLY = 8 hours
MAX_OVERTIME_DAILY = 2 hours
```

**Legal Clause:** Article 1 of Law 3846/2010
**Validation:** `weekly_hours <= MAX_WEEKLY_HOURS + MAX_OVERTIME_WEEKLY`

---

## 2. OVERTIME CALCULATIONS

### 2.1 Overtime Rates (Law 3846/2010, Article 3)
```
OVERTIME_RATE_FIRST_3_HOURS = 1.25 * hourly_rate
OVERTIME_RATE_AFTER_3_HOURS = 1.50 * hourly_rate
OVERTIME_RATE_SUNDAY = 1.75 * hourly_rate
OVERTIME_RATE_HOLIDAY = 1.75 * hourly_rate
```

**Legal Formula:**
```python
def calculate_overtime(hours_worked, hourly_rate):
    if hours_worked <= 8:
        return 0
    overtime_hours = hours_worked - 8
    if overtime_hours <= 3:
        return overtime_hours * hourly_rate * 0.25  # 25% premium
    else:
        first_3 = 3 * hourly_rate * 0.25
        remaining = (overtime_hours - 3) * hourly_rate * 0.50  # 50% premium
        return first_3 + remaining
```

### 2.2 Night Shift Premium (Law 3846/2010, Article 4)
```
NIGHT_SHIFT_RATE = 1.25 * hourly_rate
NIGHT_HOURS = 22:00 - 06:00
```

**Legal Clause:** "Work performed between 22:00 and 06:00 is compensated with 25% premium"

---

## 3. SOCIAL SECURITY (EFKA) CONTRIBUTIONS

### 3.1 Employee Contributions (Law 4387/2016)
```
EFKA_EMPLOYEE_MAIN = 6.67%
EFKA_EMPLOYEE_AUXILIARY = 6.50%
EFKA_EMPLOYEE_UNEMPLOYMENT = 0.13%
TOTAL_EMPLOYEE_EFKA = 13.30%
```

**Legal Basis:** Article 39 of Law 4387/2016
**Formula:** `employee_efka = gross_salary * 0.133`

### 3.2 Employer Contributions (Law 4387/2016)
```
EFKA_EMPLOYER_MAIN = 10.55%
EFKA_EMPLOYER_AUXILIARY = 6.50%
EFKA_EMPLOYER_UNEMPLOYMENT = 0.16%
EFKA_EMPLOYER_OCCUPATIONAL_RISK = 0.17% to 3.04% (industry-dependent)
TOTAL_EMPLOYER_EFKA = 17.38% to 20.25%
```

**Validation Rule:** `employer_contributions >= gross_salary * 0.1738`

### 3.3 EFKA Ceiling Limits (2024)
```
EFKA_MAX_MONTHLY_SALARY = €7,592.33
EFKA_MAX_DAILY_SALARY = €253.08
```

**Legal Clause:** "Contributions calculated on salary up to ceiling limit"
**Formula:** `efka_base = min(gross_salary, EFKA_MAX_MONTHLY_SALARY)`

---

## 4. INCOME TAX CALCULATIONS

### 4.1 Tax Brackets (Law 4172/2013, updated 2024)
```
TAX_BRACKETS = [
    (€0 - €10,000): 9%
    (€10,001 - €20,000): 22%
    (€20,001 - €30,000): 28%
    (€30,001 - €40,000): 36%
    (€40,001+): 44%
]
```

**Legal Formula:**
```python
def calculate_income_tax(annual_gross):
    tax = 0
    if annual_gross > 40000:
        tax += (annual_gross - 40000) * 0.44
        annual_gross = 40000
    if annual_gross > 30000:
        tax += (annual_gross - 30000) * 0.36
        annual_gross = 30000
    if annual_gross > 20000:
        tax += (annual_gross - 20000) * 0.28
        annual_gross = 20000
    if annual_gross > 10000:
        tax += (annual_gross - 10000) * 0.22
        annual_gross = 10000
    tax += annual_gross * 0.09
    return tax
```

### 4.2 Tax-Free Allowance (Law 4172/2013)
```
TAX_FREE_ALLOWANCE = €3,000 annually
TAX_FREE_MONTHLY = €250
```

**Legal Clause:** Article 9 of Law 4172/2013
**Validation:** `monthly_tax_free <= 250`

### 4.3 Special Solidarity Tax (Law 4336/2015)
```
SOLIDARITY_TAX_BRACKETS = [
    (€30,000 - €45,000): 2.2%
    (€45,001 - €65,000): 5.0%
    (€65,001 - €220,000): 6.5%
    (€220,001+): 7.5%
]
```

**Legal Basis:** Article 29A of Law 4336/2015
**Formula:** Applied on annual income above €30,000

---

## 5. HOLIDAY AND LEAVE CALCULATIONS

### 5.1 Annual Leave (Law 4611/2019)
```
ANNUAL_LEAVE_DAYS = [
    (0-1 years): 20 days
    (1-2 years): 21 days
    (2-10 years): 22 days
    (10-25 years): 25 days
    (25+ years): 26 days
]
```

**Legal Formula:**
```python
def calculate_annual_leave(years_of_service):
    if years_of_service < 1: return 20
    elif years_of_service < 2: return 21
    elif years_of_service < 10: return 22
    elif years_of_service < 25: return 25
    else: return 26
```

### 5.2 Holiday Pay (Law 4611/2019, Article 8)
```
CHRISTMAS_BONUS = 25 days salary (if worked full year)
EASTER_BONUS = 15 days salary (if worked full year)
VACATION_BONUS = 50% of vacation period salary
```

**Legal Clause:** "Holiday bonuses pro-rated based on days worked"
**Formula:** `bonus = (days_worked / 365) * full_bonus_amount`

### 5.3 13th & 14th Salary (Law 4611/2019)
```
THIRTEENTH_SALARY = 1 month salary (paid in 2 installments)
FOURTEENTH_SALARY = 50% of monthly salary (vacation bonus)
```

**Payment Schedule:**
- 13th Salary: 50% in November, 50% in December
- 14th Salary: Paid before summer vacation

---

## 6. TERMINATION AND SEVERANCE

### 6.1 Severance Pay (Law 4808/2021)
```
SEVERANCE_CALCULATION = [
    (2 months - 1 year): 1 month salary
    (1-4 years): 2 months salary  
    (4-6 years): 3 months salary
    (6-8 years): 4 months salary
    (8-10 years): 5 months salary
    (10+ years): 6 months salary
]
```

**Legal Basis:** Article 10 of Law 4808/2021
**Maximum Severance:** 12 months salary

### 6.2 Notice Period (Law 4808/2021)
```
NOTICE_PERIODS = [
    (2 months - 1 year): 1 month
    (1-2 years): 2 months
    (2-5 years): 3 months  
    (5-10 years): 4 months
    (10+ years): 5 months
]
```

**Legal Clause:** "Notice period or payment in lieu required"

---

## 7. VALIDATION FORMULAS

### 7.1 Net Salary Calculation
```python
def calculate_net_salary(gross_monthly):
    # EFKA contributions
    efka_employee = gross_monthly * 0.133
    
    # Annual tax calculation
    annual_gross = gross_monthly * 12
    annual_tax = calculate_income_tax(annual_gross)
    monthly_tax = annual_tax / 12
    
    # Solidarity tax
    solidarity_tax = calculate_solidarity_tax(annual_gross) / 12
    
    # Net calculation
    net_salary = gross_monthly - efka_employee - monthly_tax - solidarity_tax
    
    return {
        'gross': gross_monthly,
        'efka_employee': efka_employee,
        'income_tax': monthly_tax,
        'solidarity_tax': solidarity_tax,
        'net': net_salary
    }
```

### 7.2 Payroll Validation Rules
```python
VALIDATION_RULES = {
    'minimum_wage': lambda gross: gross >= 760.00,
    'efka_rate': lambda gross, efka: abs(efka - gross * 0.133) < 0.01,
    'working_hours': lambda hours: hours <= 48,  # 40 regular + 8 overtime
    'overtime_rate': lambda rate, base: rate >= base * 1.25,
    'annual_leave': lambda days, years: days >= calculate_annual_leave(years),
    'severance_cap': lambda amount, monthly: amount <= monthly * 12
}
```

---

## 8. LEGAL COMPLIANCE CHECKS

### 8.1 Mandatory Validations
1. **Minimum Wage Compliance:** All salaries ≥ €760/month
2. **EFKA Contribution Accuracy:** Employee 13.3%, Employer 17.38%+
3. **Working Time Limits:** ≤40 hours regular, ≤8 hours overtime/week  
4. **Tax Calculation Accuracy:** Progressive tax brackets applied correctly
5. **Holiday Entitlements:** Minimum annual leave respected
6. **Equal Pay:** No gender-based salary discrimination

### 8.2 Required Documentation
- Employment contracts with all legal clauses
- EFKA registration certificates
- Tax registration (AFM) verification
- Working time records (ERGANI II compliance)
- Holiday and leave tracking
- Payroll journals with all contributions

---

## 9. RECENT LEGAL UPDATES

### 9.1 2024 Changes
- **Minimum Wage:** Increased to €760/month (April 2024)
- **Digital Work Card:** Mandatory for all employees
- **ERGANI II:** Enhanced real-time reporting requirements
- **Flexible Work:** New regulations for remote work arrangements

### 9.2 Upcoming Changes (2025)
- **Green Transition Allowance:** Additional benefits for sustainable jobs
- **Digital Skills Premium:** Extra compensation for tech-related roles
- **Extended Parental Leave:** Increased from 6 to 9 months

---

## 10. FORMULA VERIFICATION STANDARDS

### 10.1 Critical Calculations
All payroll calculations MUST match these exact formulas:
```
✓ Net = Gross - (Gross × 0.133) - Income_Tax - Solidarity_Tax
✓ Overtime = Hours_Over_8 × Rate × Premium_Multiplier  
✓ Holiday_Bonus = (Days_Worked / 365) × Bonus_Amount
✓ EFKA_Max = min(Gross, €7,592.33)
✓ Annual_Leave ≥ Base_Days + Seniority_Bonus
```

### 10.2 Tolerance Levels
- **Currency Calculations:** ±€0.01 acceptable rounding
- **Percentage Calculations:** ±0.001% acceptable variance
- **Date Calculations:** Exact day accuracy required
- **Legal Compliance:** Zero tolerance for violations

---

*This reference document is legally binding for all payroll calculations.*
*Any deviation from these formulas requires legal justification and approval.*