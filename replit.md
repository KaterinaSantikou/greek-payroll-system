# Overview

PayrollSync is a comprehensive Greek HR & Payroll Management System designed for Greek businesses. Its primary purpose is to manage employee data, perform Greek-compliant payroll calculations, and ensure adherence to Greek HR compliance requirements, including tax calculations, EFKA insurance, collective agreements, and multi-step employee onboarding. The system aims to automate complex labor law processes and ensure accuracy for Greek businesses. The business vision is to provide a cutting-edge platform matching global UX velocity and compliance depth, with market potential in the Greek HR and payroll sector.

## Recent Updates (January 2025)
- **Comprehensive REST API Integration**: Completed full API architecture with 8 major endpoint categories including Auth (OIDC/SAML SSO), Employees, Time tracking, Payroll processing, Government filings, SEPA payments, and Webhooks
- **Enhanced Security & Compliance**: Implemented idempotency keys for all write operations, signed payloads for audit compliance, and comprehensive audit logging middleware
- **Greek Compliance Features**: Full integration with ERGANI II, e-EFKA/APD, and AADE/ΦΜΥ government systems with real-time synchronization
- **Advanced Middleware**: Added idempotency protection, audit logging, and performance monitoring for enterprise-grade reliability
- **Security, Privacy & Audit Framework**: Complete implementation of GDPR-native compliance, RBAC with separation of duties, immutable hash-chained audit logs, and EU data residency controls with AES-256 encryption and configurable PIT restore

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UX Architecture
- **3-Level Menu System**: Hierarchical navigation for intuitive access.
- **Contextual Organization**: Information grouped by operational context.
- **Progressive Disclosure**: Functionality revealed in manageable layers.
- **Visual Hierarchy**: Color-coded sections with icons.
- **Navigation Structure**: Includes Dashboard, People, Time, Live Compliance, Cost Insights, Payroll & Finance, Hotel Operations, and Platform.
  - **Dashboard**: Overview and management access (Main Dashboard, Manager Dashboard, Employee Self-Service)
  - **People**: Employee management with Employees (Profiles/Contracts/Documents/Assignments) and Teams & Rotas (Builder/Templates/Approvals)
  - **Time**: Time tracking and schedule management with Punches (Today/Exceptions/Corrections) and Schedules (Publish/Change Log/ERGANI Actions)
  - **Live Compliance**: Real-time monitoring with Digital Card Status, ERGANI Queue, APD & ΦΜΥ deadlines
  - **Cost Insights**: Predictive analytics with Labor Forecast, OT Heatmap, Variance vs Budget
  - **Payroll & Finance**: Comprehensive Greek payroll processing with Runs (Draft/Validate/Finalize/Post-Run Audit), Components (Earnings/Deductions/Rates/Benefits in Kind), and Bonuses (Δώρο Πάσχα/Χριστουγέννων/Επίδομα Άδειας)
  - **Payments**: Salary payment processing with Salary Files (Create SEPA/Approvals/Bank Receipts) and Off-Cycle (Urgent/Corrections/Reversals)
  - **Accounting**: Financial reconciliation and GL integration with Journal Export (Map/Preview/Post) and Reconciliation (Payroll vs GL/Variances)
  - **Filings**: Greek government compliance submissions with ERGANI II (Hires/Schedules/OT/Terminations/Receipts), e-EFKA/APD (Build/Validate/Submit/Receipts), and AADE/ΦΜΥ (Build File/Merge/Submit/Payment)
  - **Hotel Operations**: Multi-property management and deployment tools
  - **Settings**: System configuration with Policies (Overtime/Night/Sunday/Holiday/Breaks/Tips), Compliance (Minimum Wage Tables/Effective-Date Rules), Integrations (ERGANI/EFKA/AADE/Banks/ERP/SSO), and Security (Roles/Data Retention/Audit Log)
  - **Platform**: Vision & strategy with product roadmap and UX architecture documentation
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
- **API Design**: RESTful endpoints.
- **Development**: Hot module replacement with Vite.

## Database Design
- **Primary Database**: PostgreSQL via Neon serverless.
- **Schema Management**: Drizzle Kit for migrations.
- **Core Data Model**: Complete Greek payroll system with 7 primary entities:
  - **Employee**: Personal data (AFM, AMKA, IBAN), employment details, multi-property assignments
  - **Contract**: Employment contracts with type, grade, base pay, allowances, FTE percentage, CBA references
  - **Shift**: Scheduled work periods with planned/actual times, role assignments, overtime pre-approval
  - **Punch**: Time tracking events with timestamp, type, source device, location, offline support
  - **Timesheet**: Calculated work hours (regular, night, Sunday, holiday, overtime tiers, leave)
  - **PayrollLine**: Individual payroll calculations with earnings codes, hours, units, amounts, cost centers
  - **Filing**: Government compliance submissions (ERGANI II, e-EFKA/APD, AADE/ΦΜΥ) with status tracking
- **Supporting Tables**: Properties, departments, wage components, device registry, overtime requests, exceptions, compliance alerts
- **Validation**: Greek-specific validations for AFM (9-digit) and AMKA (11-digit) with proper formatting.

## System Design & Business Logic
- **Advanced Payroll Engine**: Complete Greek tax calculation with progressive brackets and EFKA insurance calculations.
- **Collective Agreements Engine**: Industry-specific wage calculations.
- **Automated Calculations**: Bonuses, allowances, overtime, Sunday, night shift, and holiday work premiums.
- **Comprehensive Compliance**: Special solidarity tax, tax-free allowances, heavy/hazardous work rates, digital labor cards, right to disconnect, flexible work, enhanced leave system, military service tracking, and multi-step onboarding forms.
- **Working Time Arrangements**: Management of predictable/unpredictable schedules, contract types, and EU Working Time Directive compliance.
- **Legal Documentation System**: Management of required documents, compliance tracking, and layoff notice calculations.
- **Health, Safety & Work Conditions**: Mandatory health and safety coordinators, first aid training, and digital work card salary protection.
- **Recent Legal Updates (August 2025)**: Incorporates updated minimum wage (€880/month), enhanced EFKA rates, digital labor card integration, and specific Sunday/dangerous work premiums.
- **Site Deployment System**: 6-step checklist for systematic PayrollSync rollouts across properties, including data upload, policy configuration, hardware provisioning, integration setup, pilot testing, and supervisor training.
- **Success Metrics Monitoring System**: KPI tracking dashboard for ERGANI submission, exception resolution, geo-verification, re-entry, overtime variance, and audit pack generation.
- **Modern Payroll Engine**: Sub-50ms calculation speed, high accuracy and automation, full ERGANI II/e-EFKA/AADE integration, Digital Work Card support, AI-powered calculations, and predictive analytics.
- **Product Vision & Principles**: Compliance-first design, automation, single source of truth employee graph, API-first architecture, and hotel-ready features (seasonal workforce, split shifts, tip pooling, multi-property).
- **Greece Compliance Anchor**: Digital Work Card system with real-time attendance and ERGANI II sync, minimum wage engine, comprehensive government flows (ERGANI II, e-EFKA, AADE), Greek special pays, and versioned rules DSL.
- **Payroll Integration Connector**: Employee master data synchronization, Greek earnings codes, cost center allocation, timesheet locking, and multi-format export.
- **Manager & Payroll Workflows**: Exception validation, overtime approval, ERGANI status monitoring, timesheet locking, reconciliation reporting, and audit pack generation.
- **Hotel-Specific Enhancements**: Multi-property employee management, department kiosks, seasonal onboarding wizard, split shifts, and Greek/English language support.
- **EU Directive 2019/1152 Compliance**: Implementation of predictable conditions directive (Law 5053/2023).
- **EFKA Insurance System Integration**: Comprehensive insurance categories and affiliations.
- **Employment Compliance & Worker Classifications**: Support for various worker categories, young worker protection, and disability support.
- **Foreign Worker Requirements**: Management of residency status and document compliance.
- **AI-Powered Compliance Recommendation Engine**: Intelligent analysis for compliance gaps, multi-category recommendations, real-time validation, and auto-fix capabilities.
- **Digital Work Card System (ERGANI II Integration)**: Mobile and kiosk solution for real-time time tracking, automated ERGANI II synchronization, hotel industry work patterns, and offline functionality.
- **Advanced Time Capture & Compliance Core**: Clock methods (Mobile QR/NFC, Kiosk/Tablet, Web, BLE/geofenced), real-time validation (schedule matching, double-punch prevention, break rules, max hours), and CBA compliance.
- **Scheduling & Overtime Management System**: Rota import/creation, overtime request/approval workflows, multiple jobs per employee, and automated change notifications.
- **Advanced Visibility & Alerts Engine**: Real-time "Who's On Now" board, threshold alerts for labor law compliance, and multi-channel notifications.
- **Security & Privacy Framework**: Role-based access control, SSO integration, device attestation, GPS tracking restrictions, Greek data retention compliance, and tamper-evident audit logging.
- **Complete Enterprise Architecture Implementation**: Separation of concerns with Mobile App/Kiosk App, Time Service API, Compliance Connector (ERGANI II), Payroll Connector, Policy Engine, and Data Lake & BI.
- **ERGANI II Real-Time Compliance System**: Complete ERGANI II connector with ordered submission, idempotency, automatic retry, quarantine queue, and mirror logging.

# External Dependencies

## Core Infrastructure
- **Neon Database**: Serverless PostgreSQL.
- **Replit Auth**: Authentication service.
- **Google Cloud Storage**: File storage for document management.

## Development Tools
- **Vite**: Build tool and development server.
- **Drizzle Kit**: Database migration and schema management.
- **ESBuild**: JavaScript bundler.

## UI and Styling
- **Radix UI**: Component library.
- **shadcn/ui**: Pre-built component system.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

## Form and Validation
- **React Hook Form**: Form library.
- **Zod**: TypeScript-first schema declaration and validation.
- **@hookform/resolvers**: Integration for React Hook Form and Zod.

## File Upload
- **Uppy**: File upload library.
- **AWS S3 Integration**: Cloud file storage via Uppy plugins.

## Development Experience
- **TypeScript**: Type safety.
- **TanStack React Query**: Server state management.
- **Wouter**: Minimalist router.