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
- **Greek Payroll System**: Progressive tax bracket calculations (9%, 22%, 28%, 36%, 44%) with 2025 rates
- **EFKA Insurance**: Employee (16%) and employer (24.78%) contribution calculations with unemployment fund (0.5%/2.55%)
- **Collective Agreements**: Industry-specific wage adjustments with €760 minimum wage (2025)
- **Digital Labor Cards**: Law 4808/2021 compliance with digital documentation requirements
- **Right to Disconnect**: Implementation of after-hours contact restrictions per Law 4808/2021
- **Flexible Work Arrangements**: Remote work support as mandated by recent legislation
- **Enhanced Leave System**: 24+ days annual leave, 119 days maternity, 14 days paternity leave
- **Multi-step Forms**: 7-tab employee onboarding with Greek compliance validation at each step

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