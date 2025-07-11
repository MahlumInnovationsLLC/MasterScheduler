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
- July 03, 2025: Complete Engineering Assignment System Integration
  - Fixed critical missing import: projectEngineeringAssignments table in storage.ts enabling assignment creation
  - Enhanced Projects API to merge engineering assignments from project_engineering_assignments table
  - Updated getProjects() method to join with assignments and populate ME/EE/ITE assigned fields with actual engineer names
  - Fixed dark mode styling for project assignment cards with proper text contrast and expanded percentage input width
  - Corrected Overview tab engineer counts to use actual engineering resources workload statistics instead of showing 0
  - Assignment creation now fully functional: users can link projects to engineers through edit dialog with immediate UI updates
  - Engineering assignments now properly display across Projects module, Overview tab, and Engineering Resource Planner
- January 09, 2025: Project Details Page UI Simplification
  - Removed Project Health section displaying health score and risk level from project-specific page
  - Removed Manufacturing section showing bay assignments and status from project-specific page
  - Extended Progress bar width from w-32 to w-64 (double the width) for better visual prominence
  - Updated grid layout from 5 columns to 3 columns to accommodate removed sections
  - Timeline Information section now spans full 3 columns instead of 5 for better layout proportion
- January 09, 2025: Manufacturing Assignment Widget Header Integration
  - Moved Manufacturing Assignment widget from sidebar to header area where removed sections were located
  - Removed the "Total Hours: 40h" display from the widget as requested
  - Updated grid layout to 2 columns to accommodate Manufacturing Assignment widget in header
  - Manufacturing Assignment widget now shows actual start/finish dates from manufacturing schedules
  - Widget displays bay number, team information, duration in days, and status badge
  - Includes Edit Assignment and View Schedule buttons for quick access
  - Removed duplicate Manufacturing Assignment widget from sidebar to avoid redundancy
- January 09, 2025: Project Details Layout Reorganization and MECH SHOP Timeline Integration
  - Reorganized layout to create vertical column with Progress, Billing, and Tasks stacked vertically
  - Removed MECH SHOP percentage card from department percentages section
  - Added MECH SHOP as timeline milestone in Project Timeline section with yellow gear icon
  - Removed Duration and Date Range from Manufacturing Assignment section for cleaner display
  - Manufacturing Assignment now shows only bay number, team, and status with action buttons
  - Updated grid layout to properly accommodate vertical stacking of Progress, Billing, and Tasks
- January 09, 2025: Project Details Final Layout Enhancement
  - Extended Progress Bar to span 2 columns covering Billing and Tasks area
  - Moved Tasks to the right of Billing in 3-column grid layout
  - Fixed MECH SHOP timeline milestone display by correcting field name from mechShopDate to mechShop
  - Moved Project Notes section to the right of Project Timeline in 2-column layout
  - Removed Additional Project Data widget from sidebar under Project Health section
  - Project Notes now positioned next to Manufacturing Assignment for better organization
- January 09, 2025: Project Details Full-Width Timeline and Notes Layout
  - Restructured layout to make Project Timeline and Project Notes span full width
  - Stacked Project Timeline and Project Notes vertically in separate section
  - Removed phantom vertical height from Manufacturing Assignment that was blocking expansion
  - Project Timeline and Project Notes now extend beyond Manufacturing Assignment section
  - Improved visual flow with full-width utilization of available space
- January 09, 2025: Project-Specific AI Insights Implementation
  - Created dedicated AI insights functionality for individual project analysis instead of company-wide insights
  - Integrated OpenAI GPT-4o model for project-specific manufacturing analysis and recommendations
  - Added new /api/ai/project-insights/:projectId endpoint with authentication middleware
  - AI insights now provide project-specific analysis in four categories: Overview, Schedule, Timeline, and Risks
  - Modal interface adapted to show project-specific insights with project ID badge and refresh functionality
  - Comprehensive project data analysis including timeline, phases, manufacturing schedules, billing milestones, and tasks
  - AI provides actionable insights tailored to individual project status, priority, and manufacturing timeline
  - Fallback error handling for cases where OpenAI service is unavailable
  - Project-specific insights accessible from AI Insights button on project details page
- July 07, 2025: Engineering Benchmarks Module Complete Implementation
  - Removed all mock benchmarks and replaced with authentic project-based benchmark system
  - Created two standard benchmark templates: "Section X CAD Complete" (30 days before fabrication start) and "CAD COMPLETE" (90 days before production start)
  - Generated real benchmarks for projects using fabrication start and production start dates from database
  - Implemented comprehensive template management system with create, edit, delete, and apply functionality
  - Added "Generate Standard Benchmarks" button to create benchmarks for all projects with proper date calculations
  - Fixed benchmark delete functionality with proper mutation handling and user feedback
  - Templates can be applied to all projects or specific projects with toggle options
  - All benchmark data now pulls from authentic project information with proper date-based calculations
- July 07, 2025: Engineering Benchmarks Progress Tracking Enhancement
  - Added progress_percentage field to engineering_benchmarks database table
  - Implemented inline interactive progress bars that can be dragged to manually set completion percentage
  - Added complete checkmark button to instantly mark benchmarks as 100% complete
  - Created comprehensive edit dialog for modifying all benchmark details including name, discipline, description, target date, commitment level, progress, and notes
  - Implemented column sorting functionality for all table columns with visual indicators (chevron icons)
  - Auto-sorting feature places completed benchmarks at the bottom of the table with reduced opacity
  - Progress bars show green when completed (100%) and blue when in progress
  - Real-time updates to progress without page refresh using React Query mutations
- July 07, 2025: Engineering Benchmarks UI and Automation Enhancements
  - Modified backend to join benchmarks with projects table to display real project numbers instead of generic "Project #" labels
  - Updated frontend interface to show actual project numbers starting with 80
  - Added scrollable container with max height to handle large numbers of benchmarks (removed 20-item limit)
  - Implemented auto-completion feature for delivered projects with dedicated API endpoint
  - Added "Auto-Complete Delivered" button to automatically mark all benchmarks as 100% complete for projects with "Delivered" status
  - Enhanced database query to include project information (project number and name) in benchmark responses
  - All benchmarks table now displays unlimited entries with proper scrolling functionality
- July 07, 2025: Engineering Overview Manual Percentage Override Implementation
  - Added manual percentage override fields to projects schema (meManualPercent, eeManualPercent, iteManualPercent, ntcManualPercent)
  - Implemented slider-based manual percentage controls in Engineering Overview "Manage" dialog
  - Added "Revert to Auto" button to restore calculated percentages from benchmark progress
  - Fixed engineering overview backend query issues that were causing database errors
  - Manual percentages override calculated values when set, providing flexibility for custom progress reporting
  - Overview tab now properly displays benchmark counts for each discipline (ME, EE, ITE, NTC) per project
  - Enhanced user experience with visual indicators showing whether percentages are manually set or auto-calculated
- July 07, 2025: Engineering Benchmarks UI Clean-up
  - Removed "Generate Standard Benchmarks" and "Auto-Complete Delivered" buttons from Benchmarks Overview interface
  - Streamlined benchmark management interface to focus on essential functions: template management and benchmark creation
  - Fixed critical authentication issue preventing Engineering Overview data access by moving endpoint to authenticated route
  - Updated all frontend query references to use proper authenticated engineering routes (/api/engineering/engineering-overview)
  - Confirmed authentication middleware working correctly with proper 401 responses for unauthenticated requests
- January 07, 2025: Hours Forecast Module Implementation
  - Created new Forecast module for tracking and predicting manufacturing hours across all projects and phases
  - Restricted access to Editor and Admin roles only through ViewerRestrictedRoute and module visibility controls
  - Implemented comprehensive hours tracking with earned, projected, and remaining hours calculations
  - Added period selection for Last Month, Last Quarter, and Year-to-Date historical performance analysis
  - Created EnhancedHoursFlowWidget similar to Cash Flow widget with week/month/quarter/year period views
  - Displays phase-by-phase hour distribution (FAB, PAINT, PRODUCTION, IT, NTC, QC) with stacked bar charts
  - Calculates hours earned based on project completion percentages and phase date ranges
  - Provides AI-powered insights for capacity utilization, peak periods, and phase distribution analysis
  - Added to main navigation in Sidebar and MobileSidebar with TrendingUp icon
  - Integrated with existing project data and manufacturing schedules for real-time calculations
- January 07, 2025: Hours Forecast Module - Scheduled Projects Only Enhancement
  - Modified Forecast module to only include projects that are actively scheduled in manufacturing bays
  - Updated calculations to filter projects based on manufacturing schedules rather than all projects
  - Enhanced year-based filtering to cross-reference with manufacturing bay schedules for 2025
  - Updated all status cards to show accurate counts for scheduled projects only
  - Modified EnhancedHoursFlowWidget to use only scheduled projects for hours flow calculations
  - All hours calculations now reflect realistic manufacturing capacity and scheduled workload
- January 07, 2025: Hours Forecast Module - Proportional Hours and Interactive Chart
  - Fixed status card calculations to show only the portion of project hours that fall within 2025 timeframe
  - Updated total hours calculation to use date overlap ratios instead of full project hours
  - Added interactive toggle buttons to show/hide chart lines (Projected, Capacity, Cumulative)
  - Implemented auto-scaling Y-axis based on visible chart elements for better visualization
  - Enhanced chart with conditional rendering of data series based on user toggle selections
  - Hours now accurately reflect time-proportional allocation matching the graph's cumulative totals
- January 07, 2025: Hours Forecast Module - Accumulated Hours Baseline Implementation
  - Updated cumulative calculation to start at 86,317 accumulated hours baseline by July 1st, 2025
  - Removed earned hours concept in favor of accumulated hours tracking from actual production data
  - Cumulative graph now builds from 86,317 in July to approximately 200,000 by year end
  - Hours calculation uses actual project total hours from manufacturing schedules proportionally distributed
  - Projected hours represent remaining work after July 1st baseline, reaching realistic year-end totals
- January 08, 2025: Capacity Management Module Implementation
  - Created comprehensive Capacity Management module with Planning and Analytics sub-tabs
  - Added database schema for departments, team members, capacity profiles, and production team capacity
  - Implemented full CRUD operations for managing team members and department capacity
  - Created TeamCapacityCard and DepartmentCapacityCard components for visual capacity tracking
  - Enabled tracking of Assembly and Electrical roles with configurable hours per week per person
  - Built department capacity management for Fabrication, PAINT, IT, NTC, and QA departments
  - Added real-time capacity analytics with utilization charts, role distribution, and efficiency trends
  - Integrated with project scheduling to show team utilization based on active projects
  - Module accessible to all users regardless of role (viewer, editor, admin)
  - Added capacity alerts for teams exceeding 85% utilization or lacking team members
- January 08, 2025: Location-Based Capacity Management Enhancement
  - Restructured Capacity Management module to organize Teams and Departments by location
  - Added location field to department_capacity table schema for Columbia Falls, MT and Libby, MT
  - Created separate tabs for each location with sub-tabs for Production Teams and Departments
  - Columbia Falls teams: Chavez/Davidson, Held/Freiheit, May/LaRose, Nelson/Mondora, Kelley/Overcast, Shultz/Mengelos
  - Libby teams: Libby MT Team and Libby Container Line Team
  - Enhanced DepartmentCapacityCard to show active project counts and workload utilization per phase
  - Department capacity now integrates with project scheduling phases (FAB, PAINT, IT, NTC, QA)
  - Analytics shows department workload based on projects currently in each manufacturing phase
  - Added capacity recommendations when departments are overloaded or upcoming projects require more resources
- January 08, 2025: Active Projects In Bay Display Enhancement
  - Added "Currently Active In Bay" display to all team capacity cards showing projects in production phases
  - Enhanced team utilization calculations to distinguish between scheduled projects and active projects in production
  - Active projects calculation filters by production-related phases (Assembly/Production, IT, NTC, QC) for current date
  - Created sample team members for both Columbia Falls and Libby locations with proper team assignments
  - Fixed database schema field name mismatches and API endpoint errors for team member data
  - Team cards now show real-time count of projects currently active in manufacturing bays
- January 08, 2025: Tier III Timeline OP Date Enhancement
  - Added OP (Original Plan) date display functionality to all timeline items in Tier III section of Meetings module
  - Implemented orange highlighting with left border when actual dates are past their OP dates
  - Applied consistent light green background for all milestone items when dates are on track
  - Enhanced timeline to show both actual dates and OP dates below each milestone
  - Updated both regular Project Timeline and Critical Project Timeline sections with same functionality
  - Timeline styling now matches project-specific page behavior with uniform color scheme
- January 09, 2025: Schedule Report QC Phase and PDF Enhancement
  - Fixed QC phase calculation in Generate Schedule Report to properly extend from QC start date to ship date
  - Recalculated total project timeline using actual sum of all phase durations for accurate percentage calculations
  - Updated phase percentage calculations to use actual total timeline instead of manufacturing schedule duration
  - Enhanced timeline visualization to show complete project span from fabrication start to ship date
  - Removed Manufacturing Schedule Details table from PDF report while keeping title changed to "Estimate Manufacturing Schedule"
  - QC phase now correctly displays 7 days (March 25 to April 1) with 6.7% width extending close to ship date
- January 09, 2025: Mobile App System Settings 404 Fix
  - Fixed missing System Settings route in mobile app routing causing 404 error
  - Added AdminRoute for /system-settings path in mobile layout matching desktop functionality
  - Updated mobile page title function to include "System Settings" title
  - Mobile users can now properly access System Settings module without 404 errors
- January 10, 2025: Schedule Report Configuration Dialog Enhancement
  - Implemented user-configurable Schedule Report with dialog interface for section selection
  - Added billing milestones section with proper API data fetching and field mapping
  - Completely removed Manufacturing Schedule section from report generation
  - Added Bay Schedule Chart visualization with interactive toggle option
  - Enhanced billing milestones data mapping to show actual milestone names and due dates
  - All existing sections (Project Overview, Timeline, Department Breakdown, Bay Schedule Chart) default to ON
  - Custom text field allows users to add personalized content under report title
  - Fixed data field mapping issues that were showing "-" and "TBD" instead of actual milestone data
- January 10, 2025: Department Schedules Module Implementation
  - Created new Department Schedules module accessible from sidebar with Factory icon
  - Implemented department-specific views: MECH Shop, Fabrication, Paint, and Wrap
  - Added location-based filtering with sub-tabs for Columbia Falls and Libby
  - Integrated with existing Bay Schedule data as read-only snapshot views
  - Uses ResizableBaySchedule component to maintain consistent UI with Bay Scheduling
  - Filters projects based on current manufacturing phase dates (mechShop, fabricationStart, paintStart, wrapDate)
  - Virtual bay created for each department/location combination showing only relevant projects
  - Projects displayed as single team with multiple rows (4 projects per row) in waterfall view
  - Week navigation controls with 12-week view range for department planning
  - Shows only the specific phase portion of each project bar (e.g., only FAB bars in Fabrication tab)
  - MECH shop bars display in orange color and start 30 working days before production phase
  - Added "Today" button to quickly jump to current week view
  - Auto-scroll functionality centers on today's date when page loads via ResizableBaySchedule component
  - Implemented skinnier row heights (20px bars) with project numbers centered in bars
  - Hide Unassigned Projects sidebar completely in Department Schedules view
  - Active project count shows only projects that have the specific phase dates
- January 10, 2025: Department Schedules Gantt Chart Enhancement
  - Major pivot from bay/row waterfall system to Microsoft Project-style Gantt chart
  - Implemented complete scrolling functionality: horizontal timeline scrolling with synchronized headers
  - Project column frozen horizontally but scrolls vertically with timeline rows for perfect alignment
  - Increased row heights to 65px to prevent project name text overlap and cutoff
  - Enhanced grid system with consistent gray-400 borders for better visibility
  - White background maintained for project column with proper contrast
  - Complete horizontal grid lines extending across all weekly columns without gaps
  - Timeline extends from January 2025 through December 2030 (314 weeks, 18,840px width)
  - Auto-scroll centers on today's date for immediate context
  - Phase bars color-coded: MECH (orange), FAB (blue), PAINT (red), WRAP (red)
  - Date labels show start/end dates below each phase bar
  - Today line indicator with red vertical line and "TODAY" label
  - Project names clickable to navigate to project details page
- January 11, 2025: Department Schedules Today Button and Capacity Integration
  - Fixed Today button functionality to properly scroll to today's date and center first active project
  - Implemented smart dual-axis positioning: horizontal scroll to today line, vertical scroll to first project crossing today
  - Added capacity information integration to department schedule titles
  - Connected with Capacity Management module to display weekly capacity hours from database
  - Created Production department capacity records for both Columbia Falls and Libby locations
  - Enhanced project filtering to only show projects with complete phase dates (both start and end dates required)
  - Projects without required dates are automatically excluded from department schedule views
  - Added "Setup Capacity" link for departments without capacity data configured
  - Fixed capacity calculation API to use correct database field names and include location information
- January 11, 2025: Department Schedules Phase Expansion
  - Added PRODUCTION, IT, NTC, and QC tabs to Department Schedules module
  - Extended tab layout from 4 to 8 departments with proper grid-cols-8 styling
  - Implemented filtering logic for all new phases with appropriate date ranges
  - Added unique color coding: PRODUCTION (green), IT (purple), NTC (cyan), QC (amber)
  - Added appropriate icons for each department: Settings, Monitor, TestTube, CheckCircle
  - Enhanced DepartmentGanttChart to handle all 8 department phases with proper date validation
  - Removed Today button from top right corner of Department Schedules page at user request
- January 11, 2025: Projects Module STATUS Column Custom Sorting Implementation
  - Implemented custom STATUS column sorting by issue type priority (MAJOR ISSUE → MINOR ISSUE → GOOD → DELIVERED → No Status)
  - Added project label assignments and available labels queries for real-time issue type data
  - Created issuePriority calculation function using actual project label assignments from database
  - Enhanced data table with statusSort function that prioritizes issue types while maintaining delivered projects at bottom
  - Table defaults to ship date sorting when STATUS column sorting is removed or cleared
  - STATUS column now properly sorts projects based on their assigned issue labels with highest priority issues appearing first
- January 11, 2025: Billing Milestone Live Date Enhancement for Project-Specific Updates
  - Enhanced Live Date logic to prioritize delivery date over ship date for delivery milestones
  - Updated project-specific billing milestone form to sync date changes to Live Date field for approval workflow
  - Added automatic liveDate updates when users edit billing milestone dates from project details page
  - Implemented approval flagging when liveDate differs from targetInvoiceDate for non-delivery milestones
  - Enhanced BillingMilestoneForm with shipDateChanged tracking for comprehensive approval workflow
  - Date changes from project-specific page now properly feed into main billing milestones approval system
- January 11, 2025: Billing Milestone Form Status and Live Date Simplification
  - Fixed billing milestone status dropdown by adding missing "billed" status option to prevent form errors
  - Removed separate Live Invoice Date field from project-specific billing milestone dialog
  - Simplified form interface so Actual Invoice Date serves as Live Invoice Date in main Billing Milestones Module
  - Updated form validation to include all valid status options (upcoming, invoiced, billed, paid, delayed)
  - Enhanced status-based conditional field display to include "billed" status trigger
- January 11, 2025: Billing Milestone Card UI Cleanup and Timezone Fix
  - Removed "Paid" line from billing milestone cards in project-specific tab to reduce visual clutter
  - Fixed timezone issue causing dates to display one day before actual selected date
  - Updated date parsing to append 'T00:00:00' ensuring correct local date display
  - Applied timezone fix to both date display formatting and milestone sorting logic
- January 11, 2025: CHASSIS+DELIVERY Milestone Detection Rule Implementation
  - Implemented critical business rule: milestones containing both "CHASSIS" and "DELIVERY" are treated as NON-DELIVERY milestones
  - CHASSIS+DELIVERY milestones represent chassis arrival at shop, not customer delivery
  - Updated both frontend and backend delivery milestone detection logic to exclude chassis delivery milestones
  - Fixed Live Date calculation to use database dates instead of delivery dates for chassis delivery milestones
  - Applied changes to all billing milestone logic: main table, project-specific cards, and approval workflow
  - Ensures proper billing milestone categorization for current and future payment milestones
- January 11, 2025: Project-Specific Billing Milestone Cards Enhancement
  - Fixed "Due" date to always display Target Invoice Date instead of other date fields
  - Restricted "Invoiced" line display to only billed/invoiced/paid milestones (hidden for upcoming milestones)
  - Replaced "No description provided" with billing milestone notes field display
  - Added Live date display for UPCOMING milestones showing calculated Live date under Due date
  - Enhanced conditional display logic to prevent invoiced dates showing for upcoming milestones
  - Billing milestone cards now show accurate and relevant information based on milestone status
  - Fixed delivery milestone Live Date calculation to use project delivery date instead of ship date
  - Updated delivery milestone synchronization to prioritize delivery date over ship date for proper Live Date calculation
  - Fixed TBD milestone display by updating import logic to preserve NULL target dates instead of defaulting to current date
  - Enhanced billing milestone ordering to include TBD milestones (NULL target dates) in project milestone lists
  - Updated milestone cards to show "TBD" for milestones without target dates instead of "Upcoming"
  - Enhanced Cash Flow Widget to show "billed" milestones as "invoiced" instead of "paid" for accurate cash flow visualization
  - Fixed cash flow calculation to properly reflect $59.5M in billed milestones as invoiced amounts in horizontal bars
  - Updated historical cash flow logic: Outstanding = Total Period Amount - Invoiced Amount (proper calculation)
  - Removed "Paid" category from historical view as requested, showing only Invoiced and Outstanding amounts
  - Enhanced historical bars to show only blue (invoiced) and orange (outstanding) segments without green (paid)
- January 11, 2025: Engineering Import Enhanced Name Matching and Data Handling
  - Enhanced engineering import functionality with improved name matching strategies
  - Added support for first name + last initial matching (e.g., "John S" matches "John Smith")
  - Implemented first name only matching when import contains single name
  - Added handling for null/blank engineer fields - skips assignment instead of creating empty records
  - Prevented overwriting existing completion percentage data when import has blank values
  - Creates OFFLINE users with exact names from import when no match is found
  - Fixed excessive feedback messages by removing verbose logging from import operations
  - Cleaned up console logging in updateProject function to reduce UI clutter during imports
  - Fixed database user creation issue by adding automatic UUID generation for new users
  - Removed verbose Excel processing logs that were causing detailed error message display
  - CRITICAL FIX: Added creation of actual engineering assignment records in project_engineering_assignments table
  - Engineering imports now properly create assignment records that Engineering module uses for project display
  - Fixed missing link between imported engineer names and actual project assignments in the database
- January 11, 2025: Engineering Module Admin Delete Functionality
  - Added trash can delete button for engineer cards in Engineering module (admin access only)
  - Implemented delete confirmation dialog with warning message before engineer deletion
  - Added admin role check to prevent non-admin users from deleting engineers
  - Delete functionality removes engineer from users table and invalidates all related queries
  - Added proper error handling and success/error toast notifications for delete operations


## User Preferences

Preferred communication style: Simple, everyday language.