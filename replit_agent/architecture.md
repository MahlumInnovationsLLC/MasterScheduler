# Architecture Overview

## Overview

This application is a project management system designed to track manufacturing projects, billing milestones, and production schedules. It's built as a full-stack web application with a React frontend and Node.js/Express backend, using PostgreSQL (via Neon Database) for data storage.

The system follows a modern web application architecture with a clear separation between the client and server components while sharing type definitions via a shared directory.

## System Architecture

### High-Level Architecture

The application follows a three-tier architecture:

1. **Frontend (Client)**: React-based SPA with Tailwind CSS for styling
2. **Backend (Server)**: Express.js API server in Node.js
3. **Database**: PostgreSQL via Neon Serverless

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Server    │     │  Database   │
│   (React)   │<────│  (Express)  │<────│ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
```

### Directory Structure

```
/
├── client/               # Frontend React application
│   ├── src/              # React source code
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   └── pages/        # Application pages/routes
├── server/               # Backend Express application
│   ├── routes/           # API route handlers
│   ├── auth*.ts          # Authentication services
│   ├── db.ts             # Database connection
│   ├── storage.ts        # Data access layer
│   └── ai.ts             # AI integrations
├── shared/               # Shared code between client and server
│   ├── schema.ts         # Database schema and type definitions
│   └── utils/            # Shared utility functions
└── migrations/           # Database migration files (not shown but referenced)
```

## Key Components

### Frontend

1. **React SPA**: Single-page application built with React for dynamic UI
2. **Tailwind CSS**: Utility-first CSS framework for styling
3. **ShadCN UI**: Component library built on Radix UI primitives
4. **React Query**: Data fetching and state management
5. **React Hook Form**: Form handling with Zod validation
6. **Wouter**: Lightweight routing library
7. **Recharts**: Charting library for data visualization

The frontend implements a protected route system to handle authentication and provides various views for project management, billing tracking, and manufacturing scheduling.

### Backend

1. **Express.js**: Web framework for handling HTTP requests
2. **Drizzle ORM**: SQL toolkit for TypeScript with Postgres
3. **Authentication**: Custom authentication system with session management
4. **OpenAI Integration**: For project health analysis and insights
5. **SendGrid**: Email service integration for notifications and password resets

The backend follows a layered architecture:
- Routes layer: Defines API endpoints
- Service layer: Business logic implementation
- Data access layer: Database operations via Drizzle ORM

### Database

The application uses a relational database (PostgreSQL) with the following key entities:

1. **Users**: User accounts with authentication and role-based permissions
2. **Projects**: Core project information including status, dates, and completion percentage
3. **Tasks**: Individual tasks within projects
4. **Billing Milestones**: Financial tracking for project billing
5. **Manufacturing Bays**: Physical production locations
6. **Manufacturing Schedules**: Scheduling of projects in manufacturing bays
7. **Notifications**: System and user notifications
8. **User Preferences**: User-specific settings and preferences

## Data Flow

### Authentication Flow

1. User submits credentials via login form
2. Server validates credentials and creates a session
3. Session ID is stored in a cookie
4. Subsequent requests include the session cookie for authentication
5. Protected routes check for valid session

### Main Application Flow

1. **Project Management**:
   - Users create, update, and view projects
   - Projects have associated tasks, milestones, and schedules
   - Project health is analyzed using AI integration

2. **Billing Management**:
   - Billing milestones track financial aspects of projects
   - System generates billing insights and notifications

3. **Manufacturing Management**:
   - Projects are scheduled in manufacturing bays
   - System provides visualization of manufacturing schedules
   - Conflicts and utilization analytics are provided

4. **Notification System**:
   - System generates notifications based on project status, billing, etc.
   - Users receive email notifications for critical events

## External Dependencies

### Third-Party Services

1. **Neon Database**: Serverless PostgreSQL provider
2. **OpenAI**: AI integration for project health analysis and insights
3. **SendGrid**: Email service for notifications

### Key Libraries

1. **Frontend**:
   - React and React DOM
   - Tailwind CSS for styling
   - Radix UI components
   - React Query for data fetching
   - DND Kit for drag-and-drop functionality
   - Recharts for data visualization

2. **Backend**:
   - Express.js for API server
   - Drizzle ORM for database access
   - OpenAI SDK for AI integration
   - SendGrid for email delivery

## Deployment Strategy

The application is configured for deployment on Replit, with the following setup:

1. **Development Environment**:
   - Vite for frontend development
   - TypeScript for type safety
   - Shared types between frontend and backend

2. **Build Process**:
   - Frontend: Vite builds static assets to `dist/public`
   - Backend: esbuild bundles server code to `dist/index.js`
   - Combined bundle is served by the Express application

3. **Production Deployment**:
   - The application runs in a Node.js environment
   - Express serves both the API and static frontend assets
   - Environment variables for configuration
   - Session management via PostgreSQL

4. **Database Management**:
   - Drizzle ORM for schema definition and migrations
   - Schema is defined in `shared/schema.ts`
   - Migration commands are provided in package.json scripts

## Security Considerations

1. **Authentication**: Custom email/password authentication with secure password hashing
2. **Authorization**: Role-based access control (admin, editor, viewer)
3. **Data Protection**: HTTPS for data transmission
4. **Session Management**: Secure HTTP-only cookies for session storage

## Future Considerations

1. **Scalability**: The current architecture can scale horizontally by adding more server instances
2. **Performance Optimization**: Potential for adding caching layers for frequently accessed data
3. **Enhanced Analytics**: Expanding the AI integration for deeper project insights
4. **Mobile Support**: The responsive UI can be enhanced for better mobile experience