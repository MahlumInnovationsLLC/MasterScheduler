# Architecture Overview

## 1. Overview

This repository contains a full-stack web application with a React frontend and Node.js Express backend. The application appears to be a project management system focused on manufacturing projects, billing milestones, and delivery tracking. It includes features for project status management, billing milestone tracking, manufacturing bay scheduling, and reporting.

The application follows a modern web architecture with a clear separation between client and server components. It uses a PostgreSQL database (via Neon's serverless Postgres) for data persistence, managed through Drizzle ORM.

## 2. System Architecture

The application follows a classic client-server architecture with the following high-level components:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│                 │       │                 │       │                 │
│  React Client   │<─────>│  Express Server │<─────>│  PostgreSQL DB  │
│                 │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Key Architecture Decisions:

1. **Monorepo Structure**: The project uses a monorepo structure with client, server, and shared directories, allowing code sharing between frontend and backend while maintaining separation of concerns.

2. **TypeScript**: The entire application is written in TypeScript, providing type safety across both client and server codebases.

3. **ORM with Schema Validation**: Drizzle ORM is used for database interactions, with Zod for schema validation, creating a type-safe pipeline from database to UI.

4. **API-First Design**: The backend exposes RESTful APIs consumed by the React frontend using React Query for data fetching and state management.

5. **Authentication**: Custom authentication system implemented with session-based auth, supporting both local credentials and potentially external providers.

## 3. Key Components

### Frontend (Client)

- **Framework**: React with TypeScript
- **State Management**: TanStack React Query for server state, local state managed with React hooks
- **Styling**: Tailwind CSS with a custom design system built on shadcn/ui components
- **Routing**: wouter (lightweight alternative to React Router)
- **Main Features**:
  - Dashboard with project overviews
  - Project status and details pages
  - Billing milestone tracking
  - Manufacturing bay scheduling
  - Interactive reports and charts
  - User preferences and system settings
  - On-time delivery tracking

### Backend (Server)

- **Framework**: Express.js with TypeScript
- **API Endpoints**:
  - Projects management
  - Tasks management
  - Billing milestones
  - Manufacturing scheduling
  - User authentication and management
  - Delivery tracking
  - AI-generated insights
- **Services**:
  - Authentication service
  - Email service (via SendGrid)
  - AI analysis service (via OpenAI)
  - Storage service (database abstraction)
  - Notification service

### Data Layer

- **Database**: PostgreSQL (via Neon's serverless Postgres)
- **ORM**: Drizzle ORM with TypeScript
- **Schema**: Comprehensive schema covering:
  - Users and authentication
  - Projects and tasks
  - Billing milestones
  - Manufacturing bays and schedules
  - Notifications
  - Delivery tracking

### Shared Code

- **Schema Definitions**: Shared database schema definitions
- **Type Definitions**: Shared TypeScript types
- **Utility Functions**: Date handling, format conversions, etc.

## 4. Data Flow

### Authentication Flow

1. User submits credentials via the login form
2. Server validates credentials and creates a session
3. Session ID is stored in a cookie
4. Subsequent requests include the session cookie for authentication
5. Protected routes check for valid session before processing requests

### Data Fetching Flow

1. React components use React Query hooks to request data
2. React Query calls the API endpoints on the server
3. Server processes the request, often involving database operations
4. Server responds with JSON data
5. React Query caches the response and updates the UI

### Data Mutation Flow

1. UI triggers a mutation operation
2. React Query sends the request to the server
3. Server validates the input using Zod schemas
4. Server performs the database operation
5. Server responds with the updated data
6. React Query invalidates affected queries, triggering re-fetches

## 5. External Dependencies

### Core Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle
- **Validation**: Zod

### Third-Party Services

- **SendGrid**: Email delivery service for notifications and password resets
- **OpenAI**: AI-powered analysis for project health metrics and insights
- **Neon Database**: Serverless PostgreSQL database

### Notable Dependencies

- **@dnd-kit**: Drag and drop functionality for manufacturing bay scheduling
- **@radix-ui**: Headless UI components used with shadcn/ui
- **@tanstack/react-query**: Data fetching and state management
- **@tanstack/react-table**: Table component for data display
- **recharts**: Chart visualization library
- **date-fns**: Date manipulation library

## 6. Deployment Strategy

The application is configured for deployment on Replit, with specific configurations in the `.replit` file. It follows a standard web application deployment flow:

1. **Build Process**:
   - Frontend: Vite builds the React application
   - Backend: esbuild bundles the server code
   - Combined output stored in the `dist` directory

2. **Runtime Configuration**:
   - Environment variables used for configuration
   - Database URL injected via environment
   - API keys for external services (SendGrid, OpenAI) configured via environment variables

3. **Deployment Targets**:
   - Set to use autoscaling on Replit
   - Exposed on port 80 (mapped from internal port 5000)

4. **Database Strategy**:
   - Uses Neon's serverless PostgreSQL
   - Connection established using WebSockets (different configs for dev vs prod)
   - Schema managed via Drizzle with migration capability

5. **CI/CD**:
   - Run button configured in Replit for easy execution
   - Development server with hot module replacement
   - Production server with optimized builds

## 7. Security Considerations

- **Authentication**: Session-based authentication with secure cookies
- **Password Management**: Proper password hashing using scrypt
- **API Protection**: Routes protected with authentication middleware
- **Input Validation**: Zod schemas used to validate input data
- **HTTPS**: Assumed to be handled by the hosting platform (Replit)
- **Role-Based Access Control**: User roles (admin, editor, viewer, pending) with appropriate permission checks

## 8. Future Considerations

The architecture supports scalability through:

1. **Component-Based UI**: Easily extended with new views/features
2. **API-First Backend**: New endpoints can be added without affecting existing ones
3. **Type Safety**: Strong typing across the stack reduces errors during expansion
4. **Shared Code**: Common code in the shared directory ensures consistency when adding features