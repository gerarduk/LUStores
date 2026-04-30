import express = require("express");
import type { Express } from "express";
import * as fs from "fs";
import * as path from "path";
import { type Server } from "http";
// import viteConfig from "../vite.config"; // Removed to avoid import.meta issues
import { nanoid } from "nanoid";
import { fileURLToPath } from 'url';

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteLogger = createLogger();
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as true,
  };

  const vite = await createViteServer({
    configFile: path.resolve(__dirname, "..", "vite.config.ts"),
    customLogger: {
      ...viteLogger,
      error: (msg: any, options: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  // Express 5 requires named wildcard parameter syntax
  app.get("/{*splat}", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // Check if the template exists, if not try alternative path
      let templatePath = clientTemplate;
      if (!fs.existsSync(templatePath)) {
        // Try alternative path for Docker environment
        templatePath = path.resolve(process.cwd(), "client", "index.html");
      }

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(templatePath, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In production (Docker), dist/public is copied to /app/dist/public
  // __dirname is /app/dist/server (where vite.js runs), so we need ../public
  // In development build, files are in dist/public relative to project root
  const distPath = path.resolve(__dirname, "..", "public");

  // Check if built static files exist
  if (!fs.existsSync(distPath)) {
    if (process.env.NODE_ENV === 'test') {
      console.log('⚠️ Test environment: Skipping static file serving (build directory not found)');
      return;
    }
    console.warn(`⚠️ Static files directory not found: ${distPath}`);
    console.warn('⚠️ Make sure to build the client first with: npm run build');
    return; // Don't throw error, just skip static serving
  }

  // Configure proper MIME types for font files
  app.use(express.static(distPath, {
    setHeaders: (res, path) => {
      // Set proper MIME types for font files
      if (path.endsWith('.woff2')) {
        res.setHeader('Content-Type', 'font/woff2');
      } else if (path.endsWith('.woff')) {
        res.setHeader('Content-Type', 'font/woff');
      } else if (path.endsWith('.ttf')) {
        res.setHeader('Content-Type', 'font/ttf');
      } else if (path.endsWith('.eot')) {
        res.setHeader('Content-Type', 'application/vnd.ms-fontobject');
      } else if (path.endsWith('.otf')) {
        res.setHeader('Content-Type', 'font/otf');
      }
      
      // Add cache headers for font files
      if (path.match(/\.(woff2?|ttf|eot|otf)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  // Express 5 requires named wildcard parameter syntax
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
