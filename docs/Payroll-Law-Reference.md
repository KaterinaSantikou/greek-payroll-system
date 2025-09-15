# Payroll Law Reference - Greek Labor Law Compliance

This document outlines the Greek labor laws, regulations, and collective bargaining agreements implemented in PayrollSync for accurate payroll processing and legal compliance.

## 📋 Table of Contents

- [Core Labor Law Framework](#core-labor-law-framework)
- [EFKA Social Security System](#efka-social-security-system)
- [Overtime and Working Time Regulations](#overtime-and-working-time-regulations)
- [Collective Bargaining Agreements (ΣΣΕ)](#collective-bargaining-agreements-σσε)
- [Severance Pay and Termination](#severance-pay-and-termination)
- [Greek Tax System](#greek-tax-system)
- [Holiday Pay and Bonuses (Δώρα)](#holiday-pay-and-bonuses-δώρα)
- [Benefits in Kind and Allowances](#benefits-in-kind-and-allowances)
- [Government System Integration](#government-system-integration)
- [Legal References and Sources](#legal-references-and-sources)

---

## Core Labor Law Framework

### Primary Legislation

**Ν. 4808/2021 - Modern Labor Relations**
- **Reference**: Law 4808/2021 on "Modern Labor Relations and Other Provisions"
- **Implementation**: Base employment contract framework, flexible working arrangements
- **Key Provisions**:
  - Employment contract types (indefinite, fixed-term, seasonal)
  - Working time flexibility and arrangements
  - Digital work cards and time tracking
  - Right to disconnect provisions

**Ν. 4093/2012 - Individual Employment Relations** ⭐ *Primary Implementation*
- **Reference**: Law 4093/2012 on "Individual Employment Relations, Severance Pay and Other Provisions"
- **Implementation**: Complete severance pay calculation system
- **Key Provisions**:
  - Severance pay scales by years of service (0-17 months)
  - Termination procedures and eligibility criteria
  - Probationary period regulations
  - Contract modification procedures

**Π.Δ. 156/1994 - General Working Conditions**
- **Reference**: Presidential Decree 156/1994
- **Implementation**: Working time limits, overtime calculations, rest periods
- **Key Provisions**:
  - Standard 8-hour daily, 40-hour weekly work limits
  - Overtime premium calculations (25%, 50%, 75%)
  - Rest period requirements (11 hours minimum)
  - Sunday and holiday work restrictions

---

## EFKA Social Security System

### EFKA Contribution Rates (2025)

**Employee Contributions**:
- **Main Insurance**: 6.67% of gross salary
- **Auxiliary Insurance**: 3.00% of gross salary  
- **Unemployment Insurance**: 0.40% of gross salary
- **Total Employee**: 10.07%

**Employer Contributions**:
- **Main Insurance**: 13.33% of gross salary
- **Auxiliary Insurance**: 3.00% of gross salary
- **Unemployment Insurance**: 0.80% of gross salary
- **Sickness Benefits**: 1.00% of gross salary
- **Work Accident Insurance**: 1.00% of gross salary
- **Total Employer**: 19.13%

### Legal Framework

**Ν. 4387/2016 - EFKA Establishment**
- **Reference**: Law 4387/2016 on "Strengthening Social Cohesion and Other Provisions"
- **Implementation**: Complete EFKA contribution calculation system
- **System Integration**: e-EFKA reporting and APD (Analytic Periodic Declaration)

**Contribution Calculation Base**:
- Minimum contribution base: €650/month (2025)
- Maximum contribution base: €6,500/month (2025)
- Tourist accommodation: Special rates apply
- Hazardous work: Additional premiums (15% extra)

---

## Overtime and Working Time Regulations

### Overtime Premium System ⭐ *3-Tier Implementation*

**Tier 1: First 2 hours**
- **Premium Rate**: 25% above regular hourly rate
- **Legal Basis**: Article 1, P.D. 156/1994
- **Calculation**: (Monthly Salary ÷ 160 hours) × 1.25

**Tier 2: Hours 3-4**  
- **Premium Rate**: 50% above regular hourly rate
- **Legal Basis**: Article 1, P.D. 156/1994
- **Calculation**: (Monthly Salary ÷ 160 hours) × 1.50

**Tier 3: Beyond 4 hours**
- **Premium Rate**: 75% above regular hourly rate
- **Legal Basis**: Article 1, P.D. 156/1994
- **Calculation**: (Monthly Salary ÷ 160 hours) × 1.75

### Premium Work Conditions

**Night Shift Premium**
- **Rate**: 25% of hourly wage
- **Time Period**: 22:00 - 06:00
- **Legal Basis**: Article 4, P.D. 156/1994
- **Stackable**: Yes, with overtime premiums

**Sunday Work Premium**
- **Rate**: 75% of hourly wage
- **Application**: All Sunday work
- **Legal Basis**: Article 6, P.D. 156/1994
- **Restrictions**: Maximum 2 Sundays per month without employee consent

**Holiday Work Premium**
- **Rate**: 100% of hourly wage (double pay)
- **Application**: All public holidays
- **Legal Basis**: Article 7, P.D. 156/1994
- **Required Days Off**: Compensatory rest required

### Working Time Limits

**Daily Limits**:
- Standard: 8 hours/day
- Maximum with overtime: 10 hours/day (exceptional circumstances)
- Maximum weekly: 48 hours including overtime

**Rest Periods**:
- Daily rest: 11 consecutive hours
- Weekly rest: 24 consecutive hours (Sunday preferred)
- Annual leave: 20-25 days based on seniority

---

## Collective Bargaining Agreements (ΣΣΕ)

### National General Collective Agreement (ΕΓΣΣΕ)

**Current Agreement**: ΕΓΣΣΕ 2021-2022
- **Minimum Wage**: €663/month (over 25), €619/month (under 25)
- **Marriage Allowance**: €25/month
- **Child Allowance**: €25/month per child (first 2 children)
- **Overtime Rates**: As per P.D. 156/1994

### Sectoral Collective Agreements

**Tourism & Hotels (ΣΣΕ Ξενοδοχείων)**
- **Wage Scales**: Category-based (A, B, C, D grades)
- **Service Charge**: 15% distributed to staff
- **Seasonal Bonus Reduction**: 50% for contracts <8 months
- **Special Allowances**: Food, accommodation, uniform

**Food & Beverage (ΣΣΕ Εστίασης)**
- **Tip Handling**: Declared tips subject to 10% flat tax
- **Split Shift Allowance**: Extra pay for broken work days
- **Weekend Premiums**: Enhanced Sunday rates
- **Meal Benefits**: Staff meals provided

**Construction (ΣΣΕ Οικοδομών)**
- **Hazardous Work Premium**: 15% additional pay
- **Weather Allowances**: Bad weather compensation
- **Tool Allowances**: Equipment provision requirements
- **Safety Training**: Mandatory certification requirements

### CBA Compliance Implementation

**PayrollSync CBA Pack System**:
- **Wage Calculation**: Property and category-based
- **Allowance Rules**: Per-day, per-shift, monthly, percentage-based
- **Premium Stacking**: Combinable premiums with conflict resolution
- **Constraint Validation**: Working time compliance checking
- **Step Advancement**: Automatic seniority progression

---

## Severance Pay and Termination

### Severance Pay Scale (Ν. 4093/2012) ⭐ *Full Implementation*

**Service Period → Severance Months**:
- **0-12 months**: 0 months severance
- **12-24 months**: 2 months salary
- **24-60 months**: 3 months salary  
- **60-120 months**: 4 months salary
- **120-180 months**: 5 months salary
- **180-240 months**: 6 months salary
- **240-300 months**: 12 months salary
- **300+ months**: 17 months salary (maximum)

### Termination Types and Eligibility

**Eligible for Severance**:
- **Dismissal without cause**: Full severance entitlement
- **Constructive dismissal**: Employee resignation due to employer breach
- **Mutual agreement**: If specified in termination agreement
- **Economic reasons**: Company restructuring/closure

**Not Eligible for Severance**:
- **Serious misconduct** (σοβαρό παράπτωμα)
- **Criminal activity** related to work
- **Breach of trust** or confidentiality
- **Job abandonment** without notice
- **Voluntary resignation** without cause

### Legal Framework References

**Article 1-3, Ν. 4093/2012**: Severance calculation methodology
**Article 4, Ν. 4093/2012**: Termination procedures and notice periods
**Article 5, Ν. 4093/2012**: Exceptions and special circumstances

---

## Greek Tax System

### Income Tax Brackets (2025) ⭐ *Progressive System*

**Tax Rates by Annual Income**:
- **€0 - €10,000**: 9%
- **€10,001 - €20,000**: 22%
- **€20,001 - €30,000**: 28%
- **€30,001 - €40,000**: 36%
- **€40,000+**: 44%

### Special Solidarity Tax

**Applicable to Annual Income > €12,000**:
- **€12,001 - €20,000**: 2.2%
- **€20,001 - €30,000**: 5.0%
- **€30,001 - €40,000**: 6.5%
- **€40,001 - €65,000**: 7.5%
- **€65,000+**: 10.0%

### Tax-Free Allowances and Benefits

**Meal Vouchers**: €11/day tax-free limit
**Company Car**: 20% of annual value as imputed income
**Housing Benefits**: Fully taxable as imputed income
**Transport Allowances**: Generally taxable unless specific exemptions apply

### Legal References

**Ν. 4172/2013**: Income Tax Code
**Ν. 4334/2015**: Tax procedure amendments
**AADE Circulars**: Annual tax rate updates and exemptions

---

## Holiday Pay and Bonuses (Δώρα)

### Greek Holiday Bonuses ⭐ *Traditional System*

**Christmas Bonus (Δώρο Χριστουγέννων)**:
- **Amount**: 25/24 of monthly salary (1.0417×)
- **Calculation**: (Monthly Salary × 25) ÷ 24
- **Proration**: Based on months worked in calendar year
- **Payment**: December salary period

**Easter Bonus (Δώρο Πάσχα)**:
- **Amount**: 1/2 monthly salary (0.5×)
- **Calculation**: Monthly Salary ÷ 2
- **Proration**: Based on months worked in calendar year
- **Payment**: April salary period

**Vacation Bonus (Επίδομα Αδείας)**:
- **Amount**: 1/2 monthly salary (0.5×)
- **Calculation**: Monthly Salary ÷ 2
- **Proration**: Based on months worked in calendar year
- **Payment**: Before summer vacation period

### Proration Rules

**Full Bonus Eligibility**: 12 months continuous employment
**Partial Employment**: Proportional to months worked
**Seasonal Workers**: 50% reduction for contracts <8 months
**Fixed-Term Contracts**: Full entitlement if meeting minimum periods

### Legal Basis

**National General Collective Agreement (ΕΓΣΣΕ)**: Traditional bonus framework
**Ν. 2112/1920**: Original holiday pay legislation
**Labor Ministry Circulars**: Annual bonus calculation guidance

---

## Benefits in Kind and Allowances

### Family Allowances

**Marriage Allowance**: €25-60/month (CBA dependent)
**Child Allowance**: €25-50/month per child (first 2 children)
**Large Family Allowance**: Additional support for 3+ children

### Position and Experience Allowances

**Management Positions**: 10-30% of base salary
**Dangerous/Hazardous Work**: 15% premium
**Night Shift Allowance**: Fixed monthly amount + hourly premiums
**Experience/Seniority**: Progressive increases by years of service
**Education Allowances**: University/technical certification bonuses

### Transportation and Meal Benefits

**Transport Allowances**: €50-150/month (location dependent)
**Meal Allowances**: €8-15/working day
**Housing Allowances**: €100-500/month (fully taxable)
**Uniform Allowances**: Industry-specific provision requirements

---

## Government System Integration

### ERGANI II - Digital Work Cards

**Legal Framework**: Ν. 4808/2021, Digital Transformation provisions
- **Real-time Reporting**: Work start/end times
- **Overtime Declaration**: Automatic overtime calculation
- **Compliance Monitoring**: Government oversight of working time
- **Penalty System**: Fines for non-compliance or late reporting

**Integration Requirements**:
- Employee check-in/check-out tracking
- Overtime pre-approval and reporting
- Schedule vs actual work reconciliation
- Monthly summary reporting to authorities

### e-EFKA Social Security Reporting

**APD (Analytic Periodic Declaration)**:
- Monthly employee contribution reporting
- Salary and working time details
- Contribution base calculations
- Special category employee reporting

**Integration Capabilities**:
- Automated monthly APD generation
- Contribution calculation validation
- Employee status change reporting
- Historical data correction procedures

### AADE Tax Authority (ΦΜΥ)

**myDATA Integration**:
- Employee expense reporting
- Company car benefit declarations
- Benefits in kind valuations
- Annual tax certificate generation

### SEPA Banking Integration

**Payroll Payment Processing**:
- **ISO 20022 pain.001** format support
- Bank-specific profiles (Alpha, Piraeus, Eurobank, NBG)
- Bulk payment processing with reconciliation
- Cut-off time management per bank
- Status reporting and error handling

---

## Legal References and Sources

### Primary Legislation

1. **Ν. 4808/2021** - "Ρύθμιση εργασιακών σχέσεων και άλλες διατάξεις"
   - [Official Gazette A' 101/2021](https://www.e-nomothesia.gr/law/4808-2021.html)

2. **Ν. 4093/2012** - "Έγκριση Μεσοπρόθεσμου Πλαισίου Δημοσιονομικής Στρατηγικής 2013-2016"
   - [Official Gazette A' 222/2012](https://www.e-nomothesia.gr/law/4093-2012.html)

3. **Π.Δ. 156/1994** - "Κανονισμός εργασίας υπαλλήλων και εργατοτεχνιτών"
   - [Official Gazette A' 90/1994](https://www.e-nomothesia.gr/pd/156-1994.html)

4. **Ν. 4387/2016** - "Ενίσχυση της κοινωνικής συνοχής και άλλες διατάξεις"
   - [Official Gazette A' 85/2016](https://www.e-nomothesia.gr/law/4387-2016.html)

### Government Websites and Resources

**Ministry of Labor and Social Affairs**
- Website: [https://www.ypakp.gr/](https://www.ypakp.gr/)
- Labor Relations: [https://www.ypakp.gr/ergasiakes-sheseis](https://www.ypakp.gr/ergasiakes-sheseis)

**EFKA (Unified Social Security Fund)**
- Website: [https://www.efka.gov.gr/](https://www.efka.gov.gr/)
- e-EFKA Services: [https://e-efka.gov.gr/](https://e-efka.gov.gr/)

**ERGANI II - Labor Inspection**
- System: [https://ergani.gov.gr/](https://ergani.gov.gr/)
- Documentation: [https://www.ypakp.gr/ergani](https://www.ypakp.gr/ergani)

**AADE (Independent Authority for Public Revenue)**
- Website: [https://www.aade.gr/](https://www.aade.gr/)
- myDATA: [https://www.aade.gr/myDATA](https://www.aade.gr/myDATA)

### Professional and Legal Resources

**GSEE (General Confederation of Greek Workers)**
- Website: [https://www.gsee.gr/](https://www.gsee.gr/)
- Collective Agreements: [https://www.gsee.gr/collective-agreements](https://www.gsee.gr/collective-agreements)

**Hellenic Statistical Authority (ELSTAT)**
- Website: [https://www.statistics.gr/](https://www.statistics.gr/)
- Labor Statistics: [https://www.statistics.gr/en/statistics/labour](https://www.statistics.gr/en/statistics/labour)

**Bar Association Legal Database**
- DSA Legal Database: [https://www.dsanet.gr/](https://www.dsanet.gr/)
- Nomothesia.gr: [https://www.e-nomothesia.gr/](https://www.e-nomothesia.gr/)

### Collective Bargaining Agreement Sources

**OMED (Organization for Mediation and Arbitration)**
- Website: [https://www.omed.gr/](https://www.omed.gr/)
- Agreement Database: [https://agreements.omed.gr/](https://agreements.omed.gr/)

**Ministry of Labor CBA Registry**
- Public Registry: [https://www.ypakp.gr/sse-registry](https://www.ypakp.gr/sse-registry)
- Sectoral Agreements: [https://www.ypakp.gr/sectoral-agreements](https://www.ypakp.gr/sectoral-agreements)

---

## Implementation Status in PayrollSync

### ✅ Fully Implemented
- **Severance Pay Calculations** (Ν. 4093/2012)
- **3-Tier Overtime System** (P.D. 156/1994)  
- **EFKA Contribution Calculations** (current rates)
- **Greek Holiday Bonuses** (Christmas, Easter, Vacation)
- **Progressive Income Tax** with solidarity tax
- **Premium Work Conditions** (night, Sunday, holiday)
- **Benefits in Kind Taxation**
- **CBA Wage Scale Integration**

### 🔄 Integration Ready
- **ERGANI II Digital Work Cards**
- **e-EFKA APD Reporting**
- **AADE myDATA Integration**
- **SEPA Banking Payments**

### 📋 Compliance Monitoring
- **Working Time Directive Compliance**
- **Constraint Violation Detection**
- **Legal Reference Tracking**
- **Version-controlled Rule Updates**

---

**Document Version**: 2025.1  
**Last Updated**: January 2025  
**Legal Disclaimer**: This document provides implementation guidance based on Greek labor law as of January 2025. Always consult with qualified legal professionals for specific compliance requirements and recent regulatory changes.

For technical implementation details, see the [PayrollSync codebase documentation](../README.md) and [test specifications](../tests/payroll/).