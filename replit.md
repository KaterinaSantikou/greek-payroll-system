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