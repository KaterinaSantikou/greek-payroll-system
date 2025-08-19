# Overview

PayrollSync is a comprehensive Greek HR & Payroll Management System built with a full-stack architecture. The application handles employee management, Greek-compliant payroll calculations, and HR compliance requirements including AFM/AMKA validation, EFKA insurance calculations, and collective agreements. The system is designed specifically for Greek businesses with multi-step employee onboarding, automated tax calculations, and extensive compliance features.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Library**: Radix UI components with shadcn/ui for consistent, accessible design system
- **Styling**: Tailwind CSS with custom CSS variables for theming and responsive design
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **File Structure**: Clean separation with components, pages, hooks, and lib directories

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect and session management
- **API Design**: RESTful endpoints with consistent error handling and validation
- **Development**: Hot module replacement with Vite integration for seamless development

## Database Design
- **Primary Database**: PostgreSQL via Neon serverless database
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Key Tables**: 
  - employees (comprehensive Greek employee data with AFM, AMKA, EFKA details)
  - payroll_records (salary calculations with Greek tax compliance)
  - users (Replit Auth integration)
  - sessions (secure session storage)
- **Validation**: Greek-specific validations for AFM (9-digit tax ID) and AMKA (11-digit social security)

## Business Logic - Updated for 2025 Greek Labor Law Compliance
- **Advanced Payroll Engine**: Complete Greek tax calculation system with progressive brackets (9%, 22%, 28%, 36%, 44%) and 2025 rates
- **EFKA Insurance System**: Full employee (16%) and employer (24.78%) contribution calculations with unemployment fund (0.5%/2.55%)
- **Collective Agreements Engine**: Industry-specific wage calculations for 5 major sectors (General, Banking, Tourism, Construction, Commerce)
- **Experience & Education Bonuses**: Automated calculation of experience-based and education-level salary adjustments
- **Marriage & Family Allowances**: Comprehensive family benefits calculation system per collective agreements
- **Overtime & Sunday Premium**: Advanced overtime calculations with Greek labor law rates (25%-75% premiums)
- **Special Solidarity Tax**: Automated 2.2% solidarity tax calculation for income over €12,000
- **Tax-Free Allowances**: Personal, marital, children, and disability allowance calculations
- **Heavy & Hazardous Work**: Special insurance rates for dangerous professions (construction, maritime, etc.)
- **Digital Labor Cards**: Law 4808/2021 compliance with digital documentation requirements
- **Right to Disconnect**: Implementation of after-hours contact restrictions per Law 4808/2021
- **Flexible Work Arrangements**: Remote work support as mandated by recent legislation
- **Enhanced Leave System**: 24+ days annual leave, 119 days maternity, 14 days paternity leave
- **Military Service Tracking**: Comprehensive tracking of military service status and completion dates for Greek male citizens
- **Multi-step Forms**: 7-tab employee onboarding with Greek compliance validation at each step

### Working Time Arrangements System (August 2025)
- **Predictable/Unpredictable Schedules**: Advanced schedule management with 48-hour notice requirements for unpredictable schedules
- **Standard Weekly Hours Tracking**: EU compliance with 40-hour standard and 48-hour maximum weekly limits
- **Trial Period Management**: Comprehensive tracking with 2-12 month durations based on position complexity
- **Contract Types**: Full support for full-time, part-time, temporary, seasonal, freelance, apprenticeship, and internship contracts
- **Schedule Flexibility**: Remote work arrangements, flexible hours, core working time requirements, and compressed workweeks
- **Premium Rate Calculations**: Automated calculation of night work (25%), weekend work (75%), holiday work (100%), and hazardous work (20%) premiums
- **EU Working Time Directive**: Complete compliance monitoring with rest periods, consecutive work days, and maximum hours validation
- **Greek Labor Law Integration**: Full compliance with Law 4808/2021 amendments including right to disconnect

### Special Allowances & Bonuses System (August 2025)
- **Greek Holiday Bonuses**: Mandatory Christmas (25 days salary), Easter (15 days), and Vacation bonuses (15 days) with automatic calculations
- **Regular Allowances**: Transport, Food, Uniform, Education, and Position allowances with tax exemption tracking
- **Industry-Specific Allowances**: Banking, Tourism, Construction, Healthcare, and Commerce sector allowances
- **Family Allowances**: Marriage allowance (€50/month) and children allowances (€40-100 per child based on order)
- **Premium Rate Calculations**: Automated calculation of night work, weekend, holiday, and hazardous work premiums
- **Tax Compliance**: Comprehensive tax exemption limits and social security subject tracking
- **Performance-Based Allowances**: Support for commission-based and performance-linked allowances
- **Collective Agreement Integration**: Industry-specific allowance rates per collective agreements
- **Holiday Bonus Tracking**: Complete tracking of mandatory Greek holiday bonuses with eligibility verification
- **Allowances Calculator**: Interactive calculator for total allowances with real-time breakdown

### Overtime & Special Hours System (August 2025)
- **Greek Labor Law Overtime Rates**: Standard overtime (25% increase), urgent overtime (50% increase) with legal limits
- **Sunday Work Premiums**: Regular Sunday (75% increase), essential services (100% increase) with sector-specific rules
- **Night Shift Premiums**: Standard night shift (25% increase), full night shift (40% increase) with health requirements
- **Holiday Work Premiums**: National holidays (100% increase), religious holidays (75% increase) with 2025 Greek calendar
- **Special Conditions Premiums**: Hazardous work (20% increase), extreme weather (15% increase), remote locations (10% increase)
- **Compliance Monitoring**: Daily, weekly, and annual overtime limits with automatic violation detection
- **Interactive Calculator**: Real-time premium calculations with comprehensive breakdown and approval requirements
- **Greek Holidays 2025**: Complete calendar with Orthodox Easter dates and premium rates
- **EU Working Time Directive**: 48-hour weekly limits, rest period requirements, and consecutive work day monitoring

### Leave Management System (August 2025)
- **Annual Leave Calculations**: 20-25 days based on tenure with automatic entitlement calculations per Greek labor law
- **Sick Leave Tracking**: 15 days paid sick leave, extended sick leave (50% pay), chronic illness provisions (75% pay)
- **Parental Leave Entitlements**: 119 days maternity leave, 14 days paternity leave, 4 months unpaid parental leave
- **Special Leave Types**: Marriage (6 days), bereavement (1-5 days), military service, blood donation, education leave
- **Unpaid Leave Management**: Personal leave (30 days), sabbatical leave (12 months), study leave (2 years)
- **Leave Balance Calculations**: Real-time balance tracking with carry-over limits and mandatory usage requirements
- **Validation System**: Comprehensive leave request validation with conflict detection and compliance monitoring
- **Interactive Interface**: 5-tab management system for balance, requests, entitlements, calendar, and reports
- **Greek Compliance**: Full compliance with Greek labor law including special categories (young workers, mothers, disabled)
- **Tenure-Based Entitlements**: Automatic calculation of leave days based on years of service and employee category

### Recent Legal Updates (August 2025)
- Updated minimum wage to €760/month
- Enhanced EFKA rates: 16% employee, 24.78% employer
- Digital labor card integration
- Collective agreements for major industries (General, Banking, Tourism, Construction, Commerce)
- Sunday work premiums (75% increase)
- Dangerous work rates (20-35% increase depending on industry)

### EFKA Insurance System Integration (August 2025)
- **Comprehensive Insurance Categories**: IKA, OAEE, ETAA, and OTHER classifications
- **Insurance Package Types**: Full, Basic, Reduced, and Special coverage options
- **Special Professional Categories**: Heavy/Unhealthy, Hazardous, Maritime, Military, Police, Firefighter, Journalist, Artist, Athlete
- **Fund Affiliations**: Main Fund, Auxiliary Fund, Health Fund, Unemployment Fund, Family Benefits
- **Additional Registrations**: ERGANI (Labor Inspection System), TEKA (Engineers/Technicians Fund)
- **Automated Contribution Calculations**: Based on employee category and special profession requirements

### Employment Compliance & Worker Classifications (August 2025)
- **Worker Categories**: Employee, Independent Contractor, Seasonal, Apprentice, Intern, Temporary
- **Young Worker Protection**: Under 25 years old with special subsidies and reduced employer contributions
- **Independent Contractor Classes**: Professional, Artist, Technical, Consultant, Services classifications
- **Disability Support**: 0-100% disability percentage with certificate management and accommodations
- **Disability Types**: Physical, Mental, Sensory, Multiple, Psychosocial, Chronic conditions
- **Compliance Requirements**: 8% disability quota for companies over 50 employees, young worker subsidies

### Foreign Worker Requirements (August 2025)
- **Residency Status**: EU Citizen, Non-EU Permanent, Non-EU Temporary, Refugee classifications
- **Document Management**: Passport tracking with country and expiry date validation
- **Visa Information**: Tourist, Business, Student, Work, Family Reunion visa types with expiry tracking
- **Work Permits**: Number and expiry date tracking for non-EU workers
- **Residence Permits**: Number and expiry date tracking for legal residency
- **Compliance Monitoring**: Automatic alerts for expiring documents and permit renewals

### AI-Powered Compliance Recommendation Engine (August 2025)
- **Intelligent Analysis**: Automated scanning of employee data for compliance gaps and violations
- **Multi-Category Recommendations**: Identification, EFKA, Worker Classification, Foreign Worker, Disability, General compliance
- **Priority-Based System**: High, Medium, Low priority recommendations with automated severity assessment
- **Real-Time Validation**: AFM checksum validation, AMKA Luhn algorithm verification, document expiry monitoring
- **Auto-Fix Capabilities**: Automated corrections for simple compliance issues with user approval
- **Organization-Wide Monitoring**: Company-level compliance including disability quotas and young worker subsidies
- **Deadline Tracking**: Automatic alerts for expiring work permits, residence permits, and passports
- **Military Service Compliance**: Automated detection of missing military service information for eligible Greek citizens
- **Compliance Dashboard**: Visual overview of compliance status with actionable recommendations

# External Dependencies

## Core Infrastructure
- **Neon Database**: Serverless PostgreSQL for production database hosting
- **Replit Auth**: Authentication service with OpenID Connect integration
- **Google Cloud Storage**: File storage service for document management

## Development Tools
- **Vite**: Build tool and development server with HMR
- **Drizzle Kit**: Database migration and schema management tool
- **ESBuild**: Fast JavaScript bundler for production builds

## UI and Styling
- **Radix UI**: Comprehensive component library for accessible UI primitives
- **shadcn/ui**: Pre-built component system built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography

## Form and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema declaration and validation library
- **@hookform/resolvers**: Integration between React Hook Form and Zod

## File Upload
- **Uppy**: File upload library with dashboard interface
- **AWS S3 Integration**: Cloud file storage through Uppy plugins

## Development Experience
- **TypeScript**: Full type safety across frontend and backend
- **TanStack React Query**: Server state management with caching and synchronization
- **Wouter**: Minimalist router for React applications