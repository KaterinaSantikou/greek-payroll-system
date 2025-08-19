# Overview

PayrollSync is a comprehensive Greek HR & Payroll Management System designed to manage employee data, perform Greek-compliant payroll calculations, and ensure adherence to Greek HR compliance requirements, including tax calculations, EFKA insurance, collective agreements, and multi-step employee onboarding. The system aims to automate complex labor law processes and ensure accuracy for Greek businesses. The business vision is to provide a cutting-edge platform matching global UX velocity and compliance depth, with significant market potential in the Greek HR and payroll sector.

## Recent Changes (August 2025)
- **Smart Notifications & Approvals System**: Implemented comprehensive notification system with Slack/Teams integration for overtime approvals and ERGANI failure alerts
- **Real-time Approval Workflows**: Added direct approval buttons in Slack/Teams without context switching
- **Email Digest Service**: Weekly compliance and payroll readiness summaries with professional templates
- **Notification Center**: Modern React frontend with notification management, preferences, and integration settings

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