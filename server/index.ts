import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { seedDatabase } from "./dbSeed";
import { logger } from "./logger";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Export app for testing purposes before starting the server
export { app };

// Request logging middleware - only log errors
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const method = req.method;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    // Only log errors (5xx) and slow requests (>1s)
    if (res.statusCode >= 500 || duration > 1000) {
      logger.warn(`${method} ${path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  
  next();
});

(async () => {
  // Ensure required directories exist
  const requiredDirs = [
    './backups',
    './archives',
    './public/uploads',
    './public/uploads/invoices'
  ];

  for (const dir of requiredDirs) {
    const fullPath = path.resolve(dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  }

  // Start the server FIRST, then initialize database in background
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error('Unhandled error', err);
    res.status(status).json({ message });
    throw err;
  });

  if (process.env.NODE_ENV === "development") {
    try {
      logger.info('Setting up Vite development server...');
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
      logger.info('Vite development server setup successful');
    } catch (error: any) {
      logger.error('Vite setup failed', error);
      logger.warn('Falling back to API-only mode in development');
    }
  } else {
    const { serveStatic } = await import("./vite");
    serveStatic(app);
  }

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info(`Server listening on port ${port}`);
  });

  // Initialize database in background AFTER server is listening
  (async () => {
    try {
      logger.info('Initializing database schema...');
      const { initializeDatabase } = await import('./dbInit');
      await initializeDatabase();
      logger.info('Database schema initialized');
    } catch (error) {
      logger.error('Database schema initialization failed', error);
      // Don't crash the server
    }

    try {
      logger.info('Seeding database...');
      await seedDatabase();
      logger.info('Database seeding completed');
    } catch (error) {
      logger.error('Database seeding failed', error);
      // Don't crash the server
    }

    try {
      logger.info('Initializing default system settings...');
      const { initializeDefaultSettings } = await import('./permissions');
      await initializeDefaultSettings();
      logger.info('Default system settings initialized');
    } catch (error) {
      logger.error('Default system settings initialization failed', error);
      // Don't crash the server
    }
  })();
})();
