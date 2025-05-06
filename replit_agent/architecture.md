# Architecture Overview

## Overview

This repository contains a full-stack project management application specifically designed for manufacturing and project tracking. The application provides features for project status monitoring, billing milestones tracking, manufacturing bay scheduling, delivery tracking, and various reporting capabilities.

The system follows a typical client-server architecture with a React frontend, Express.js backend, and PostgreSQL database. It's designed to run on Replit's hosting environment and leverages several external services including OpenAI for AI-powered insights and SendGrid for email communications.

## System Architecture

### High-Level Architecture

The application follows a three-tier architecture:

1. **Frontend**: React-based single-page application (SPA) with Tailwind CSS for styling
2. **Backend**: Node.js Express server serving both the API and static frontend assets
3. **Database**: PostgreSQL database (via Neon serverless Postgres) accessed through Drizzle ORM

### Directory Structure

```
/
├── client/             # Frontend React application
│   ├── src/            # React source code
│   │   ├── components/ # Reusable UI components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── lib/        # Utility functions and shared logic
│   │   └── pages/      # Page components
├── server/             # Backend Express server
│   ├── routes/         # API route handlers
│   ├── db.ts           # Database connection configuration
│   └── storage.ts      # Database access layer
├── shared/             # Code shared between client and server
│   ├── schema.ts       # Database schema definitions
│   └── utils/          # Shared utility functions
└── migrations/         # Database migration files (managed by Drizzle ORM)
```

## Key Components

### Frontend

1. **React SPA**: The client is built with React, utilizing React Query for data fetching, Wouter for routing, and React Hook Form for form handling.

2. **UI Components**: The UI uses a component library based on ShadCN/UI with heavy customization for the manufacturing domain. Uses Tailwind CSS for styling.

3. **State Management**: Primarily uses React Query for server state and React Context for global app state (auth, theme, etc.).

4. **Data Visualization**: Integrates Recharts for data visualization in dashboards and reports.

5. **Drag and Drop**: Uses dnd-kit for drag-and-drop functionality in the manufacturing bay layout.

### Backend

1. **Express.js Server**: The backend is built with Express.js, providing REST API endpoints for the frontend.

2. **Authentication**: Custom authentication implementation using Passport.js with local strategy (username/password). Includes session management with PostgreSQL storage.

3. **Database Access Layer**: Custom storage layer abstraction that provides type-safe database access methods.

4. **AI Integration**: Integration with OpenAI API for generating project health analysis and insights.

5. **Email Service**: Integration with SendGrid for sending transactional emails like password reset notifications.

### Database

1. **Schema**: The database schema is defined using Drizzle ORM with TypeScript, ensuring type safety across the application.

2. **Tables**:
   - `users` - User accounts and authentication
   - `projects` - Project information
   - `tasks` - Project tasks
   - `billingMilestones` - Billing milestones for projects
   - `manufacturingBays` - Manufacturing facility resources
   - `manufacturingSchedules` - Scheduling of manufacturing bays
   - `userPreferences` - User-specific application settings
   - `notifications` - System and user notifications
   - `deliveryTracking` - Project delivery status tracking
   - `archivedProjects` - Historical project data

3. **Migrations**: Database migrations managed by Drizzle Kit

## Data Flow

### Authentication Flow

1. User submits login credentials to `/api/auth/login`
2. Server validates credentials against stored password hash
3. On success, a session is created and stored in the PostgreSQL database
4. Session ID is returned to the client as a cookie
5. Subsequent requests include this cookie for authentication

### Project Management Flow

1. Projects are created with basic information (name, dates, client, etc.)
2. Tasks can be added to projects for tracking
3. Billing milestones are created to manage financial aspects
4. Manufacturing schedules are created to allocate resources to projects
5. Project status and health are updated automatically based on task completion and schedule adherence
6. AI-powered insights are generated to help identify risks and opportunities

### Notification System

1. System generates notifications based on project events (delays, billing milestones, etc.)
2. Users can view and manage notifications through a centralized notification interface
3. Email notifications can be sent for critical updates (requires user opt-in)

## External Dependencies

### Core Technologies

- **React**: Frontend framework
- **Express.js**: Backend framework
- **PostgreSQL**: Database (Neon serverless)
- **Drizzle ORM**: Database access and schema management
- **TypeScript**: Type safety throughout the application

### Frontend Libraries

- **React Query**: Data fetching and caching
- **Wouter**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: Component library foundation
- **Recharts**: Data visualization
- **dnd-kit**: Drag-and-drop functionality
- **date-fns**: Date manipulation
- **Zod**: Schema validation

### Backend Services

- **OpenAI API**: AI-powered insights and analytics
- **SendGrid**: Email services
- **Neon Database**: Serverless PostgreSQL

## Deployment Strategy

The application is designed for deployment on Replit's platform, with specific configuration for both development and production environments.

### Development Environment

1. The application uses Vite's development server for the frontend with hot module replacement
2. The server runs in development mode with more verbose logging
3. Environment variables are loaded from Replit's environment

### Production Deployment

1. The frontend is built with Vite and output to the `dist/public` directory
2. The server is compiled with esbuild
3. Express serves both the API and the static frontend assets
4. The production server runs from the compiled JS in the `dist` directory

### Scaling Considerations

1. The application uses Neon's serverless PostgreSQL which can scale automatically
2. The server is stateless except for the session store, allowing for horizontal scaling
3. Long-running operations (like AI analysis) are designed to be asynchronous to prevent blocking the main server

### Monitoring and Error Handling

1. Comprehensive error handling for API requests with detailed error responses
2. Global error handlers for uncaught exceptions to prevent server crashes
3. Custom logging for API requests to facilitate debugging
4. Runtime error overlay for development environment

## Security Considerations

1. **Authentication**: Secure password storage using scrypt with salt
2. **Session Management**: HTTP-only, secure cookies for session management
3. **CORS**: Configured for the specific deployment environment
4. **Input Validation**: Zod schema validation for all user inputs
5. **Password Reset**: Secure token-based password reset functionality
6. **Role-Based Authorization**: Different access levels (admin, editor, viewer) with middleware protection for sensitive routes