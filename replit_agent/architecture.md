# Architecture Overview

## 1. Overview

The TIER IV PRO application is a comprehensive project management system specifically designed for manufacturing businesses. It provides capabilities for project tracking, billing milestone management, manufacturing bay scheduling, on-time delivery analysis, and reporting. The application follows a modern full-stack architecture with a React frontend and Node.js backend, using PostgreSQL for data storage.

## 2. System Architecture

The application follows a client-server architecture with clear separation between frontend and backend:

### Frontend Architecture
- React-based single-page application (SPA)
- Uses Tailwind CSS for styling with a custom theme system
- Component-based UI architecture with shadcn/ui components
- State management via React Query for server state and React context for client state
- Client-side routing with Wouter

### Backend Architecture
- Node.js Express server
- RESTful API architecture
- TypeScript for type safety across the stack
- Authentication middleware
- Serverless database connection
- Email notification service

### Database
- PostgreSQL database (via Neon's serverless Postgres)
- Drizzle ORM for database schema management and queries
- Schema with relations for projects, tasks, billing milestones, etc.

## 3. Key Components

### Frontend Components
1. **Authentication System**
   - Login/registration forms
   - Password reset functionality
   - Protected routes

2. **Dashboard**
   - Project statistics
   - Billing milestone summaries
   - Manufacturing schedule overview

3. **Project Management**
   - Project CRUD operations
   - Status tracking
   - Task management
   - Project archiving

4. **Billing Management**
   - Billing milestone tracking
   - Payment status management
   - Financial analytics

5. **Manufacturing Management**
   - Manufacturing bay allocation
   - Scheduling with drag-and-drop functionality
   - Utilization analytics
   - Conflict detection

6. **Reporting System**
   - On-time delivery metrics
   - Financial reports
   - Manufacturing efficiency metrics
   - Data visualization with Recharts

7. **User Experience Components**
   - Notification system
   - Theme switching (dark/light)
   - User preferences

8. **Data Import/Export**
   - Excel data import functionality
   - Report exports

### Backend Components
1. **API Layer**
   - RESTful endpoints for all frontend features
   - Structured route organization
   - Request validation with Zod

2. **Authentication Services**
   - Local username/password authentication
   - Session management
   - Permission-based authorization

3. **Database Layer**
   - Drizzle ORM for type-safe database access
   - Schema management
   - Query optimization

4. **Business Logic**
   - Project health analysis
   - Manufacturing schedule management
   - Billing status calculations

5. **Integration Services**
   - Email notifications via SendGrid
   - AI insights via OpenAI
   - Data import/export utilities

6. **Notification System**
   - User notifications
   - Email alerts
   - System notifications

## 4. Data Flow

1. **Authentication Flow**
   - User submits credentials via the frontend
   - Backend validates credentials against stored user data
   - Upon successful authentication, session is created
   - Frontend stores authentication state in context
   - Protected routes check authentication state

2. **Project Management Flow**
   - User creates/edits project data via forms
   - Data is validated client-side
   - API requests are sent to backend endpoints
   - Backend validates request data
   - Database operations are performed
   - Updated data is returned to frontend
   - React Query invalidates queries to refresh UI

3. **Manufacturing Scheduling Flow**
   - User interacts with drag-and-drop interface
   - Schedule changes trigger validation for conflicts
   - Backend updates schedule data
   - Notifications may be generated for affected users

4. **Notification Flow**
   - System events generate notifications
   - Notifications are stored in database
   - Users are notified in real-time
   - Email notifications may be sent for high-priority items

5. **Reporting Flow**
   - User selects report parameters
   - Backend aggregates data from multiple tables
   - Formatted data is returned to frontend
   - Frontend renders visualizations

## 5. External Dependencies

### Frontend Dependencies
- **UI Framework**: React with shadcn/ui components
- **Styling**: Tailwind CSS
- **State Management**: React Query, React Context
- **Forms**: React Hook Form with Zod validation
- **Data Visualization**: Recharts
- **Date Handling**: date-fns
- **Drag and Drop**: @dnd-kit libraries
- **HTTP Client**: Fetch API with custom wrapper

### Backend Dependencies
- **Server Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (via Neon serverless)
- **Authentication**: Passport.js, express-session
- **Email Service**: SendGrid
- **AI Integration**: OpenAI API
- **File Processing**: xlsx for Excel handling

## 6. Deployment Strategy

The application is configured for deployment on Replit's infrastructure:

1. **Development Environment**
   - Vite for frontend development
   - tsx for TypeScript execution in development
   - Hot module replacement for rapid iteration

2. **Build Process**
   - Frontend built with Vite
   - Backend bundled with esbuild
   - Combined into a single deployment package

3. **Production Deployment**
   - Node.js server serves both the API and static frontend assets
   - Automatic scaling configured via Replit
   - Environment variables for configuration

4. **Database Deployment**
   - Externally hosted PostgreSQL database (Neon)
   - Connection via environment variables
   - Schema migrations managed via Drizzle

5. **Monitoring and Error Handling**
   - Runtime error overlay in development
   - Global error handlers to prevent server crashes
   - Error logging for production debugging

## 7. Security Considerations

1. **Authentication Security**
   - Password hashing using scrypt
   - HTTPS enforcement
   - Secure cookies
   - CSRF protection

2. **Authorization**
   - Role-based access control (admin, editor, viewer, pending)
   - Middleware to verify permissions
   - Frontend route protection

3. **Data Security**
   - Input validation
   - Parameterized queries
   - API rate limiting

4. **External Communications**
   - Secure API keys management
   - Encrypted communications