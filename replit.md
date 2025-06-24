# TIER IV PRO - Manufacturing Project Management System

## Overview

TIER IV PRO is a comprehensive project management system specifically designed for manufacturing businesses. The application provides end-to-end capabilities for project tracking, billing milestone management, manufacturing bay scheduling, quality assurance, and supply chain management. Built with modern web technologies, it serves as a centralized hub for managing complex manufacturing projects from initial sales deals through final delivery.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **State Management**: React Query for server state management and React Context for client state
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Custom component library built on Radix UI primitives
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for full-stack type safety
- **API Design**: RESTful API with comprehensive CRUD operations
- **Authentication**: Replit OIDC integration with session management
- **File Processing**: Excel/CSV import capabilities using XLSX library
- **Email Service**: Integrated email notifications via SendGrid and MailPro

### Database Design
- **Database**: PostgreSQL via Neon's serverless platform
- **ORM**: Drizzle ORM for type-safe database queries and migrations
- **Schema Management**: Migration-based schema evolution with versioned changes
- **Connection Pooling**: Optimized connection management for serverless environment

## Key Components

### Project Management Core
- **Projects**: Complete project lifecycle management with status tracking, timeline management, and resource allocation
- **Tasks**: Hierarchical task management with assignments, deadlines, and priority levels
- **Billing Milestones**: Financial milestone tracking with invoice scheduling and payment status
- **Manufacturing Schedules**: Bay-based production scheduling with resource optimization

### Manufacturing Operations
- **Bay Management**: Physical manufacturing bay tracking with capacity planning
- **Production Scheduling**: Timeline-based scheduling with conflict detection
- **Quality Assurance**: Non-conformance reports, corrective actions, and quality documentation
- **Supply Chain**: Benchmark tracking and vendor management

### Business Intelligence
- **Sales Pipeline**: Deal tracking from initial contact through project launch
- **Financial Reporting**: Revenue forecasting and milestone-based billing analysis
- **Performance Metrics**: Project health monitoring and delivery performance tracking
- **Export Capabilities**: Comprehensive reporting in CSV, PDF, and DOCX formats
- **PTN Integration**: Real-time production tracking with external PTN system integration

### User Management
- **Role-Based Access**: Admin, Editor, and Viewer roles with granular permissions
- **Department Filtering**: Notifications and data access based on department assignments
- **User Preferences**: Customizable interface and notification settings
- **Audit Trail**: Comprehensive forensics tracking for all data modifications

## Data Flow

### Project Lifecycle
1. **Sales Pipeline**: Deals are tracked in the sales forecast module
2. **Project Creation**: Approved deals are converted to active projects
3. **Manufacturing Planning**: Projects are scheduled across manufacturing bays
4. **Progress Tracking**: Real-time updates on fabrication, assembly, and quality phases
5. **Billing Management**: Milestone-based invoicing with automated notifications
6. **Delivery Tracking**: Final delivery coordination and performance analysis

### Data Synchronization
- **Real-time Updates**: WebSocket connections for live data updates across clients
- **External Integrations**: API connections to external metrics systems
- **Import/Export**: Bulk data operations via CSV/Excel templates
- **Backup Systems**: Automated database backups with restoration capabilities

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **Replit Infrastructure**: Hosting platform with integrated development environment
- **SendGrid**: Primary email delivery service for notifications
- **MailPro**: Secondary email service for backup delivery

### Development Tools
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Fast TypeScript compilation for production builds
- **Node-fetch**: HTTP client for external API integrations
- **XLSX**: Excel file processing for data imports

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **React Hook Form**: Form state management and validation

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot module replacement
- **Database**: Direct connection to Neon serverless PostgreSQL
- **Authentication**: Bypassed for development with mock user system

### Production Environment
- **Build Process**: Vite builds client assets, ESBuild compiles server code
- **Deployment Target**: Replit's autoscale infrastructure
- **Database Connection**: Pooled connections with automatic scaling
- **Session Management**: PostgreSQL-backed session store for scalability

### Environment Configuration
- **Database URL**: Configured via environment variables
- **API Keys**: Secure storage of external service credentials
- **Session Security**: Cryptographically secure session management
- **CORS Configuration**: Properly configured for cross-origin requests

## Changelog

- June 24, 2025: Initial setup
- June 24, 2025: PTN API integration with real-time production data
  - Connected to live PTN system at https://ptn.nomadgcsai.com
  - Identified data structure issues with numeric key format
  - Created comprehensive API format specification for PTN team
  - Implemented fallback parsing for current data structure
  - Enhanced Meetings module Tier II section with PTN project tracking

## User Preferences

Preferred communication style: Simple, everyday language.