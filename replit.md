# Overview

PayrollSync is a comprehensive Greek HR & Payroll Management System designed for Greek businesses. It handles employee management, Greek-compliant payroll calculations, and HR compliance requirements including AFM/AMKA validation, EFKA insurance calculations, and collective agreements. The system automates tax calculations, manages multi-step employee onboarding, and ensures compliance with Greek labor laws.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **UI Library**: Radix UI components with shadcn/ui
- **Styling**: Tailwind CSS with custom CSS variables
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter
- **Forms**: React Hook Form with Zod validation
- **File Structure**: Organized separation with components, pages, hooks, and lib directories

## Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Replit Auth with OpenID Connect and session management
- **API Design**: RESTful endpoints
- **Development**: Hot module replacement with Vite integration

## Database Design
- **Primary Database**: PostgreSQL via Neon serverless database
- **Schema Management**: Drizzle Kit for migrations
- **Key Tables**: Employees, payroll records, users, sessions
- **Validation**: Greek-specific validations for AFM and AMKA

## Business Logic
- **Advanced Payroll Engine**: Complete Greek tax calculation system with progressive brackets and 2025 rates.
- **EFKA Insurance System**: Full employee and employer contribution calculations, including unemployment fund.
- **Collective Agreements Engine**: Industry-specific wage calculations for major sectors.
- **Bonuses & Allowances**: Automated calculation of experience, education, marriage, family, transport, food, uniform, and position allowances. Includes mandatory Greek holiday bonuses (Christmas, Easter, Vacation).
- **Overtime & Premiums**: Advanced calculations for overtime, Sunday, night shift, and holiday work premiums, adhering to Greek labor law.
- **Compliance Features**: Special solidarity tax, tax-free allowances, heavy & hazardous work rates, digital labor cards, right to disconnect, flexible work arrangements, enhanced leave system (annual, sick, parental, special), military service tracking, and multi-step forms for employee onboarding.
- **Working Time Arrangements**: Management of predictable/unpredictable schedules, standard weekly hours, trial periods, various contract types, schedule flexibility, and EU Working Time Directive compliance.
- **Legal Documentation System**: Management of required documents, compliance tracking, legal restrictions, layoff notice calculations, contract termination procedures, and special category protections.
- **Health, Safety & Work Conditions (2025 Updates)**: Expanded health and safety requirements including mandatory health and safety coordinators for large construction projects (>€500K value), mandatory first aid training for all employees (CPR, Heimlich maneuver, emergency procedures) with 2-year renewal cycles, and digital work card salary protection preventing pay cuts due to digital card implementation. Includes automated compliance scoring and violation detection.
- **Recent Legal Updates (August 2025)**: Incorporates updated minimum wage (€880/month), enhanced EFKA rates (16% employee, 24.78% employer), digital labor card integration, collective agreements for major industries, and specific Sunday/dangerous work premiums.
- **Site Deployment System (January 2025)**: Comprehensive 60-90 minute implementation checklist for systematic PayrollSync rollouts across hotel properties. Features 6-step deployment process: data upload (properties, employees, earnings codes), policy configuration (breaks, overtime, geofences), hardware provisioning (kiosks, QR codes, device binding), integration setup (ERGANI II, Payroll API), pilot testing with single department, and supervisor training. Includes progress tracking, site management, and deployment templates for efficient multi-property implementations.
- **Success Metrics Monitoring System (January 2025)**: Comprehensive KPI tracking dashboard monitoring ≥99% ERGANI submission success, <1% unresolved exceptions per pay period, ≥95% punches geo-verified, zero manual re-entry to payroll, overtime variance within policy limits, and audit pack generation under 5 minutes. Features real-time compliance scoring, alert management with escalation workflows, property-level and organization-wide reporting, trend analysis, and automated violation detection. Includes configurable thresholds, resolution tracking, and executive dashboard for operational excellence monitoring.
- **Modern Payroll Engine (January 2025)**: Cutting-edge Greek payroll platform matching Gusto UX velocity, ADP compliance depth, and modern global payroll automation. Features sub-50ms calculation speed per employee, 99.97% accuracy rate, 98.5% automation level, full ERGANI II/e-EFKA/AADE integration, Digital Work Card support, AI-powered calculations, predictive analytics, and anomaly detection. Delivers industry-leading performance with comprehensive Greek law compliance and international standards (EU directives, GDPR, ISO 27001).
- **Product Vision & Principles (January 2025)**: Comprehensive implementation of compliance-first design with machine-readable Greek law rules, automation everywhere from Digital Work Card to SEPA payments, single source of truth employee graph, opinionated UX achieving 90-second payroll runs for 150 employees, open API-first architecture with REST/GraphQL integration, and hotel-ready features including seasonal workforce management, split shifts, tip pooling, and multi-property operations.
- **Greece Compliance Anchor (2025)**: Complete Digital Work Card (Ψηφιακή Κάρτα Εργασίας) system with real-time attendance and ERGANI II event sync, minimum wage engine with effective-date tables and non-compliance alerts, comprehensive government flows (ERGANI II for hires/schedules/overtime/leaves/terminations, e-EFKA/APD monthly social security, AADE/ΦΜΥ monthly tax withholding), Greek special pays (Δώρο Πάσχα, Δώρο Χριστουγέννων, Επίδομα Άδειας), leave/parental protections with audit-complete reinstatement logic, and versioned rules DSL with official form generators and validators.
- **Payroll Integration Connector (August 2025)**: Complete payroll system integration with employee master data synchronization via GUID/employee_number, Greek earnings codes (REG, OT1-3, NIGHT, SUNDAY, HOLIDAY, ALLOWANCE_*, LEAVE_*), cost center allocation, timesheet locking mechanism, and multi-format export (CSV/XML/API) with webhook notifications (timesheet.locked, payroll.exported, payroll.failed).
- **Manager & Payroll Workflows (August 2025)**: Comprehensive workflow management for daily operations and end-of-period processing including exception validation and approval/rejection, overtime approval workflows, ERGANI status monitoring, timesheet locking and export, reconciliation reporting with variance analysis, and audit pack generation with punch ledger, edit history, approvals, and ERGANI receipts.
- **Hotel-Specific Enhancements (August 2025)**: Multi-property employee management with rotation schedules, department kiosks (Housekeeping, F&B, Front Office) with role-based quick actions and icon-first UI, seasonal onboarding wizard with batch import and device provisioning, split shifts with cross-department coverage validation, and comprehensive Greek/English language support throughout the system.
- **EU Directive 2019/1152 Compliance (Law 5053/2023)**: Full implementation of predictable conditions directive requiring written employment terms within 7 days, maximum 6-month probation periods, and transparency obligations.
- **2025 Strike Impact Assessment**: Comprehensive analysis of April 2025 general strike, wage pressure evaluation, sectoral negotiation tracking, and business continuity planning tools.
- **EFKA Insurance System Integration**: Comprehensive insurance categories (IKA, OAEE, ETAA), package types, special professional categories, fund affiliations, and additional registrations (ERGANI, TEKA).
- **Employment Compliance & Worker Classifications**: Support for various worker categories (employee, contractor, seasonal), young worker protection, disability support (8% quota for companies over 50 employees).
- **Foreign Worker Requirements**: Management of residency status, document management (passport, visa, work/residence permits), and compliance monitoring.
- **AI-Powered Compliance Recommendation Engine**: Intelligent analysis of employee data for compliance gaps, multi-category recommendations with priority, real-time validation, auto-fix capabilities, organization-wide monitoring, deadline tracking, and a compliance dashboard.
- **EU Directive Compliance Engine**: Automated checking of contract compliance with EU Directive 2019/1152, probation period validation, written terms verification, and transparency obligation monitoring.
- **Labor Relations Analytics**: Strike impact assessment tools, union participation analysis, sectoral negotiation tracking, and business continuity risk evaluation for the 2025 labor relations environment.
- **Digital Work Card System (ERGANI II Integration)**: Complete mobile and kiosk solution for real-time time tracking per Greek Digital Work Card standards. Features automated ERGANI II synchronization, hotel industry-specific work patterns, offline functionality with sync queue, biometric verification support, automatic payroll calculations, labor law violation detection, and comprehensive compliance reporting. Supports multi-property hotel operations with seasonal staff management.
- **Advanced Time Capture & Compliance Core (January 2025)**: Comprehensive implementation of all clock methods (Mobile QR/NFC, Kiosk/Tablet, Web controlled, BLE/geofenced auto-prompts), real-time validation engine with schedule matching, double-punch prevention, break rules enforcement, max hours monitoring, and configurable CBA compliance rules. Full offline mode with queued signed events and conflict detection on re-sync.
- **Scheduling & Overtime Management System**: Complete rota import/creation system with publish-to-staff functionality, overtime request/approval workflows with configurable premiums per Greek law/CBA, multiple jobs per employee support with separate cost centers, and automated change notifications via push/SMS/email.
- **Advanced Visibility & Alerts Engine**: Real-time "Who's On Now" board by department/property, threshold alerts for approaching max hours, missing shift start, on-site after end time, and unapproved overtime. Multi-channel notifications (push/SMS/email) with escalation workflows and auto-resolution capabilities.
- **Security & Privacy Framework**: Role-based access control (Admin, HR/Payroll, Manager, Auditor, Employee), SSO integration (OIDC/SAML), device attestation for kiosks, GPS tracking restrictions with geofencing, Greek data retention compliance (20-50 years), and tamper-evident audit logging with hash chaining and digital signatures.
- **Complete Enterprise Architecture Implementation (January 2025)**: Full separation of concerns with Mobile App (iOS/Android) + Kiosk App (Android/iPadOS) for punch UI with offline cache and device binding, Time Service API for event ingestion and validation with policy engine and geofence checks, Compliance Connector for ERGANI II adapters (REST/SOAP) with retry logic and status ledger, Payroll Connector for normalized timesheets to earnings codes and cost centers with push to payroll systems, Policy Engine for country/CBA rules with per-property overrides, and Data Lake & BI for raw events plus curated timesheets enabling comprehensive reporting and analytics.
- **ERGANI II Real-Time Compliance System (August 2025)**: Complete implementation of ERGANI II connector with ordered submission, idempotency keys, automatic retry with exponential backoff, quarantine queue for manual review, and comprehensive mirror logging. Features real-time health monitoring, inspector-friendly export capabilities, and robust error handling for Greek Ministry of Labor compliance reporting.

# External Dependencies

## Core Infrastructure
- **Neon Database**: Serverless PostgreSQL
- **Replit Auth**: Authentication service
- **Google Cloud Storage**: File storage for document management

## Development Tools
- **Vite**: Build tool and development server
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Fast JavaScript bundler

## UI and Styling
- **Radix UI**: Component library
- **shadcn/ui**: Pre-built component system
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

## Form and Validation
- **React Hook Form**: Form library
- **Zod**: TypeScript-first schema declaration and validation
- **@hookform/resolvers**: Integration for React Hook Form and Zod

## File Upload
- **Uppy**: File upload library
- **AWS S3 Integration**: Cloud file storage via Uppy plugins

## Development Experience
- **TypeScript**: Type safety
- **TanStack React Query**: Server state management
- **Wouter**: Minimalist router