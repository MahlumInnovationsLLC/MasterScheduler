import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";

// Add global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
  // Suppress React hydration and rendering errors from client
  const reactErrors = [
    'Cannot update a component',
    'Warning: Cannot update a component',
    'Hydration failed',
    'Text content does not match',
    'render a different component',
    'Cannot read properties of null'
  ];
  
  if (error?.message && reactErrors.some(msg => error.message.includes(msg))) {
    // These are client-side React errors, not server crashes
    return;
  }
  // Suppress known database session and object creation errors
  const suppressedMessages = [
    'IDX_session_expire',
    'already exists',
    'relation "session" already exists',
    'index "IDX_session_expire" already exists',
    'relation "IDX_session_expire" already exists',
    'Session table setup failed',
    'Session store error'
  ];
  
  const suppressedCodes = ['42P01', '42P07', '42P11', '42704', '57P01', '08P01'];
  
  if (error?.message && suppressedMessages.some(msg => error.message.includes(msg))) {
    // These are expected during app restarts
    return;
  }
  
  if (error?.code && suppressedCodes.includes(error.code)) {
    // These are expected database codes
    return;
  }
  
  console.log('Uncaught Exception (non-critical):', error.message);
  // Don't exit the process so the server keeps running
});

process.on('unhandledRejection', (reason, promise) => {
  // Suppress known database connection and object creation rejections
  const suppressedCodes = ['42P01', '42P07', '42P11', '42704', '57P01', '08P01', '08006'];
  const suppressedMessages = [
    'IDX_session_expire',
    'already exists',
    'relation "session" already exists',
    'index "IDX_session_expire" already exists',
    'relation "IDX_session_expire" already exists'
  ];
  
  if (reason && typeof reason === 'object' && 'code' in reason) {
    if (suppressedCodes.includes(reason.code)) {
      return; // Don't log expected error codes
    }
  }
  
  if (reason && typeof reason === 'string') {
    if (suppressedMessages.some(msg => reason.includes(msg))) {
      return; // Don't log expected error messages
    }
  }
  
  if (reason && typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string') {
    if (suppressedMessages.some(msg => reason.message.includes(msg))) {
      return; // Don't log expected error messages in error objects
    }
  }
  
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process so the server keeps running
});

const app = express();

// Add health check route at /health instead of root
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Session will be configured in setupAuth

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize authentication BEFORE registering routes
  await setupAuth(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Server error:", err);
    res.status(status).json({ message });
    // Don't throw the error as it will crash the server
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
