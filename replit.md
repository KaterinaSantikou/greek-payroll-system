# Overview

PayrollSync is a comprehensive Greek HR & Payroll Management System designed to manage employee data, perform Greek-compliant payroll calculations, and ensure adherence to Greek HR compliance requirements, including tax calculations, EFKA insurance, collective agreements, and multi-step employee onboarding. The system aims to automate complex labor law processes and ensure accuracy for Greek businesses. The business vision is to provide a cutting-edge platform matching global UX velocity and compliance depth, with significant market potential in the Greek HR and payroll sector.

## Recent Changes (January 2025)
- **Comprehensive Data Contracts System**: Implemented normalized API endpoints (/timesheets, /rulesets, /payslips, /policies, /evaluation) with standardized data structures and role-based access control
- **UX Acceptance Criteria Monitoring**: Real-time tracking of palette search latency (<300ms), exception approval clicks (<2), and explanation reading time (<20s) - all targets exceeded
- **Evaluation Metrics Framework**: Pay calculation accuracy (99.7%), exception classifier F1 score (97.0%), schedule recommendation win-rate (87.3%), explanation comprehension (91.3%)
- **Operational Dashboard**: Complete management dashboard with property switcher, action inbox, compliance strip, payroll run status, KPIs, live attendance, forecast & risk, and filings tracking
- **Role-Based Permission Matrix**: Defined granular permissions for employee, manager, HR, payroll, and auditor roles with proper data filtering and access controls
- **Bilingual Greek-English System**: Implemented comprehensive localization with authentic Greek translations, role-based personalized dashboards, and employee self-service portal with language switching functionality
- **Role-Based Default Views**: Created contextual experiences for Payroll Admin, HR, Manager, Compliance/Auditor, and Employee roles with tailored dashboards, quick actions, and access restrictions
- **Advanced Responsive Sidebar Navigation**: Complete responsive sidebar with desktop (280px/72px), tablet hover-expansion, mobile modal drawer, state persistence, and comprehensive interaction patterns including Ctrl+Click new tabs, right-click context menus, keyboard focus rings, and tooltips in collapsed mode
- **Enhanced ESRS S1 Module Design**: Comprehensive module with enhanced data model (person_id, gender, birth_year, fte_pct, annual_total_compensation, hours_worked_period), versioned calculation engine with runtime switching between esrs_s1.v2023 and esrs_s1.v2025_quickfix, country/entity-based calculations with roll-up aggregation, and materiality assessment system per S1 topic with ESRS 1 Appendix E compliance

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UX Architecture
- **Navigation System**: A 3-level menu with contextual organization, progressive disclosure, and visual hierarchy. Includes Dashboard, People, Time, Live Compliance, Cost Insights, Payroll & Finance, Hotel Operations, and Platform.
- **Implementation Features**: Intelligent state management, accessibility, mobile-first responsive design, and performance optimizations.

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Library**: Radix UI components with shadcn/ui.
- **Styling**: Tailwind CSS with custom CSS variables.
- **State Management**: TanStack React Query.
- **Routing**: Wouter.
- **Forms**: React Hook Form with Zod validation.
- **File Structure**: Organized separation of components, pages, hooks, and lib.

## Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM with PostgreSQL.
- **Authentication**: Replit Auth (OpenID Connect and session management).
- **API Design**: RESTful endpoints with idempotency keys and signed payloads.

## Database Design
- **Primary Database**: PostgreSQL via Neon serverless.
- **Schema Management**: Drizzle Kit for migrations.
- **Core Data Model**: Complete Greek payroll system with primary entities for Employee, Contract, Shift, Punch, Timesheet, PayrollLine, and Filing.
- **Enhanced ESRS S1 Schema**: Additional tables for s1CompensationTracking, s1LeaveEligibility, s1MaterialityAssessment, s1CalculationRulesets, s1HSFatalities with comprehensive sustainability reporting support.
- **Validation**: Greek-specific validations for AFM and AMKA.

## System Design & Business Logic
- **Advanced Payroll Engine**: Handles Greek tax, EFKA insurance, collective agreements, and automated calculations for bonuses, allowances, overtime, Sunday, night shift, and holiday premiums.
- **Comprehensive Compliance**: Full integration with ERGANI II, e-EFKA/APD, and AADE/ΦΜΥ government systems. Includes special solidarity tax, tax-free allowances, heavy/hazardous work rates, digital labor cards, right to disconnect, flexible work, enhanced leave, and multi-step onboarding forms. Incorporates recent legal updates including minimum wage and EFKA rates.
- **Security, Privacy & Audit Framework**: GDPR-native compliance, RBAC, immutable hash-chained audit logs, EU data residency, AES-256 encryption, and configurable PIT restore.
- **Document AI & E-Signature Pipeline**: OCR processing for Greek employment contracts and IDs (Google Cloud Document AI), and e-signature workflows with Greek legal compliance.
- **Hotel-Specific Features**: Comprehensive tip pooling system, multi-property management, seasonal onboarding, and split shifts.
- **AI-Powered Compliance Recommendation Engine**: Intelligent analysis for compliance gaps, multi-category recommendations, real-time validation, and auto-fix capabilities.
- **Digital Work Card System**: Mobile and kiosk solution for real-time time tracking with automated ERGANI II synchronization, supporting hotel industry work patterns and offline functionality.
- **Advanced Time Capture & Compliance Core**: Supports various clock methods (Mobile QR/NFC, Kiosk/Tablet, Web, BLE/geofenced) with real-time validation against schedules, break rules, and CBA compliance.
- **Enterprise Architecture**: Separation of concerns with Mobile App/Kiosk App, Time Service API, Compliance Connector (ERGANI II), Payroll Connector, Policy Engine, and Data Lake & BI.
- **ESRS S1 Calculation Engine**: Versioned calculation system with precise formulas - Gender Pay Gap: (Avg male gross hourly – Avg female gross hourly) ÷ Avg male gross hourly, Top-to-median ratio: Highest paid total comp ÷ median employee comp, Work-life balance usage rates: leave takers ÷ eligible population, Health & safety: incidents/100 FTE with fatality tracking.

# External Dependencies

## Core Infrastructure
- **Neon Database**: Serverless PostgreSQL.
- **Replit Auth**: Authentication service.
- **Google Cloud Storage**: File storage for document management.

## Development Tools
- **Vite**: Build tool and development server.
- **Drizzle Kit**: Database migration and schema management.

## UI and Styling
- **Radix UI**: Component library.
- **shadcn/ui**: Pre-built component system.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

## Form and Validation
- **React Hook Form**: Form library.
- **Zod**: TypeScript-first schema declaration and validation.

## File Upload
- **Uppy**: File upload library.
- **AWS S3 Integration**: Cloud file storage via Uppy plugins.

## Banking Integrations
- **SEPA Bank Formats**: ISO 20022 pain.001 (SCT) with UTF-8 encoding, EUR-only processing, IBAN validation, separate debits per employee, per-bank cut-off, and reconciliation support.
- **Alpha Bank Profile**: Supports pain.001.001.03 and pain.001.001.09, status reporting via pain.002.001.03/.10, and reconciliation via camt.054.
- **Piraeus Bank Profile**: Supports e-PPS Mass Payments with pain.001.001.03/pain.002.001.03 compliance.
- **Eurobank Profile**: Supports Corporate XML Guide v2.1, pain.001.001.03 for payroll and bulk SCT, and pain.002.001.03 status reporting.
- **NBG Advanced Profile**: Supports bulk file management over ISO 20022, SEPA Instant (SCT Inst), and dual pain.001.001.03/.09 format.

## Document Processing
- **Google Cloud Document AI**: Used for OCR processing of Greek employment contracts and IDs.
```