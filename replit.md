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
- June 27, 2025: Future Predictions Analytics Module
  - Added comprehensive "Future Predictions" tab to Reports & Analytics
  - Implemented bay utilization predictions for next 6 months
  - Created bay availability timeline showing when bays become free
  - Built 12-week capacity forecast with utilization metrics
  - Added project delivery predictions with risk assessment
  - Real-time calculations based on current manufacturing schedules
  - Interactive charts using Area, Bar, and timeline visualizations
- June 27, 2025: PAINT and IT Start Date Implementation
  - Added PAINT start and IT start columns to database schema and project table
  - Implemented automated date calculations: PAINT starts 7 working days before production, IT starts 7 working days before NTC testing
  - Populated 133 projects with PAINT start dates and 116 projects with IT start dates
  - Added OP (Original Plan) date columns for PAINT start, Production start, and IT start phases
  - Set current calculated dates as baseline OP dates for tracking future changes
  - All date calculations properly account for weekends using working day calculations
- June 27, 2025: Assembly Start Column Removal and MECH Shop Date Implementation
  - Removed Assembly Start column from project table (redundant with Production Start)
  - Added MECH shop date calculations: 30 working days before Production start date
  - Updated 133 projects with precise MECH shop dates using PostgreSQL working day calculations
  - Verified all MECH shop dates are exactly 30 working days before their respective production start dates
  - Set current calculated MECH shop dates as OP (Original Plan) baseline dates for all 133 projects
- June 27, 2025: Enhanced Bay Utilization Calculation System
  - Completely redesigned utilization calculation to be purely team project count based
  - Implemented realistic capacity model: 1 project = 75%, 2 projects = 100%, 3+ projects = 120%
  - Teams with 2+ projects now show at full capacity (100%) until projects end
  - Removed physical bay row considerations, focusing entirely on team workload
  - Successfully includes all 7 manufacturing teams except LIBBY teams
  - Fixed Future Predictions chart aggregation to only include active teams with projects
  - Chart now displays accurate 100%+ utilization when teams are at capacity instead of constant 60%
  - Fixed date forcing issue that was calculating all future months based on current projects
  - Utilization now properly drops to 0% when projects end, providing realistic capacity forecasting
  - Chart accurately shows team capacity declining as projects complete and no new ones are scheduled
- June 30, 2025: Reports & Analytics Module Enhancement
  - Renamed "Reports" module to "Reports & Analytics" throughout the application
  - Added comprehensive "Nomad GCS Analytics" tab with internal performance tracking
  - Implemented Phase Handoff Performance analysis comparing actual vs original planned dates
  - Added Schedule Change Control Board tracking for projects with formal schedule changes
  - Created Delivery vs Original Plan variance analysis for completed projects
  - Built Timeline Recovery Analysis to track projects that recovered to original dates
  - All analytics use real project data including PAINT start, Production start, IT start dates
  - Performance metrics calculate on-time vs delayed handoffs across all project phases
  - Analytics provide actionable insights for internal process improvement and timeline management
- June 30, 2025: Enhanced Nomad GCS Analytics with Real Data Analysis
  - Completely revamped Phase Handoff Performance with actual variance calculations and success rates
  - Enhanced Delivery vs Original Plan with comprehensive delivered project analysis and trend charts
  - Added detailed Schedule Change Control analysis with phase-specific impact metrics
  - Implemented Timeline Recovery Analysis with recovery success rates by manufacturing phase
  - All metrics now use real database queries showing actual vs planned date variances
  - Added "Worst Delivery Variances" and "Best Recovery Examples" with specific project details
  - Created monthly delivery trend charts and project categorization analysis
  - Integrated authentic data from 266 total projects including 101 delivered projects
  - Performance analytics now show real variance data, recovery rates, and change control metrics
- June 30, 2025: Comprehensive Manufacturing Phase Analysis Enhancement
  - Expanded Schedule Change Control to include ALL 10 manufacturing phases: Fabrication Start, PAINT Start, Production Start, IT Start, Wrap Date, NTC Testing, QC Start, Executive Review, Ship Date, and Delivery Date
  - Updated Phase Impact Analysis to track changes across all manufacturing phases with average impact calculations
  - Enhanced project-specific change tracking to show all phase variances with exact day differences
  - Added comprehensive project listing showing delivered projects with multiple phase misses that were never recovered
  - All calculations now include the complete manufacturing timeline from fabrication through delivery
  - Analytics properly distinguish between individual phase handoffs vs project-level performance metrics
- June 30, 2025: Material Management Module Light Mode Enhancement
  - Updated all CSS styling from dark mode to light mode with proper dark mode fallbacks
  - Enhanced readability in light mode interface with appropriate color schemes
  - Maintained color-coded status indicators (IN QC, IN WORK, Inventory Job Cart, SHIPPED)
  - Updated cards, backgrounds, text colors, and form elements for light mode compatibility
  - All interactive elements now properly styled for both light and dark mode themes
- July 01, 2025: Engineering Module Access Control Implementation
  - Fixed Engineering Resource Planner access control to allow ANY user with EDITOR or ADMIN roles
  - Removed department restriction that was preventing non-engineering users from accessing the module
  - Updated client-side module visibility hook to properly use userRole from permissions context
  - Enhanced server-side middleware to block VIEWER access while allowing EDITOR/ADMIN across all departments
  - Fixed hook integration issues between PermissionsManager and useAuth contexts
  - Resolved Engineering page access control to use userRole instead of user object dependency
  - Engineering module now properly displays in sidebar and grants page access for all authorized users regardless of department
- July 02, 2025: FAB Notes Implementation in Tier III Module
  - Added dedicated FAB notes field (fab_notes) to projects database schema separate from general project notes
  - Implemented FAB notes functionality exclusively in Tier III Sub Tab for projects currently in FAB phase
  - Created FAB notes editing dialog with clear distinction from general project notes
  - Added FAB notes button and preview display for each FAB project card showing fabrication phase progress
  - FAB notes only appear when projects are actively in fabrication phase (between FAB start and assembly start dates)
  - Enhanced Meetings module with dedicated state management and API mutations for FAB notes
  - FAB notes are visually distinguished with blue theming and clearly labeled as FAB-specific content
- July 02, 2025: Draggable FAB Progress Bar Implementation
  - Added fab_progress field to projects database schema for storing user-adjusted progress values
  - Implemented fully interactive draggable progress bar for FAB projects in Tier III Sub Tab
  - Progress defaults to date-based calculation but allows manual adjustment via clicking or dragging
  - Added visual indicators to distinguish custom progress from auto-calculated progress
  - Included reset functionality to return to automatic date-based progress calculation
  - Enhanced user experience with hover tooltips and visual feedback during interaction
  - Progress bars show "(Custom)" indicator when user has manually adjusted the progress
- July 02, 2025: Enhanced Cash Flow Widget and Billing Analysis Completion
  - Enhanced Cash Flow Widget now treats all BILLED milestones as PAID for historical cash flow analysis
  - Modified calculation logic so BILLED milestones contribute to "Total Paid" metrics instead of "Total Invoiced"
  - Completed full light theme compatibility for all Enhanced Cash Flow Widget styling elements
  - Updated all chart backgrounds, text colors, progress bars, and AI insights section for light mode
  - Removed Revenue Forecast widget from bottom of Billing Milestones page as requested
  - All billing milestone status display issues resolved with 222 historical billing records showing correct "Billed" status
- July 02, 2025: Milestone Status Widget Enhancement with Future/TBD Categorization
  - Added comprehensive fourth category "Future/TBD" to Milestone Status widget for complete milestone visibility
  - Enhanced milestone calculation logic to properly categorize all 356 total milestones across four distinct categories
  - Milestone Status widget now displays: Invoiced/Billed (222), Overdue (2), Upcoming (38), Future/TBD (94)
  - Fixed categorization logic to properly distinguish between immediate attention milestones (next 30 days) vs future planning milestones
  - Future/TBD category includes both milestones beyond 30 days (93) and milestones without dates assigned (1)
  - Enhanced BillingStatusCard component with blue theming for the new Future/TBD category
  - Milestone breakdown now provides clear action priorities: 134 total open milestones requiring attention, with 38 needing immediate focus
  - Removed Revenue Summary widget from top of Billing Milestones page for cleaner UI design
- July 03, 2025: Engineering Module Department-Based Access Control Enhancement
  - Enhanced Engineering module visibility to allow VIEWER role users in engineering department to access and edit within the module
  - Updated client-side module visibility logic in use-module-visibility.ts to check both role and department for engineering module
  - Modified Engineering.tsx component to include department-based access control with canEditEngineering() permission function
  - Added server-side requireEngineeringAccess middleware to allow EDITOR/ADMIN roles or VIEWER roles in engineering department
  - Updated engineering routes mounting to use new middleware instead of generic requireEditor middleware
  - Engineering module now grants full editing capabilities to viewers in the engineering department while maintaining security
  - Access denied message updated to reflect new requirements: EDITOR/ADMIN role OR VIEWER role in engineering department
- July 03, 2025: Engineering Module API and Dark Mode Fixes
  - Fixed duplicate PUT routes in engineering backend causing routing conflicts
  - Corrected all apiRequest parameter order issues in engineering mutations (method, url, data)
  - Updated backend engineering resource endpoints to properly handle user-based resources with data merging
  - Fixed dark mode styling issues for "Add Engineer" and view toggle buttons in Resource Planning tab
  - Applied proper color contrast using CSS variables for consistent theme support across light/dark modes
  - Engineering resource updates (discipline changes like ME to EE) now working correctly with proper API calls
- July 03, 2025: Engineering Module Project Assignment Fix
  - Fixed critical engineer-project assignment display issue by correcting ID mapping between frontend and backend
  - Changed engineering resources endpoint to use actual database IDs instead of index-based IDs
  - Project assignments now properly display in engineer cards with correct project names and completion percentages
  - Engineer assignment functionality now works correctly for multiple projects per engineer
  - Fixed React hooks error by moving all hook declarations before conditional returns in Engineering component
- July 03, 2025: Engineering Module String ID Schema Migration
  - Updated database schema: project_engineering_assignments.resource_id changed from integer to varchar(255)
  - Modified foreign key constraint to reference users.id instead of engineering_resources.id
  - Updated backend routes to handle string resource IDs instead of parsing as integers
  - Fixed engineering resource PUT and GET routes to work with user ID strings
  - Cleared existing assignment data to support new user ID-based assignment system

## User Preferences

Preferred communication style: Simple, everyday language.