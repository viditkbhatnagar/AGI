import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import os from "os";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { connectDB } from "./db";

// ─── CORS ──────────────────────────────────────────────────────────────
/**
 * Accept a comma‑separated list in the env var ALLOWED_ORIGINS
 * e.g. "https://elearning.globalagi.org,https://www.elearning.globalagi.org"
 * If not provided, fall back to the hard‑coded defaults below.
 */
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

const defaultOrigins = [
  "https://elearning.globalagi.org",
  "https://www.elearning.globalagi.org",
  "https://globalagi.org",
  "https://www.globalagi.org",
];

// during local dev, also allow localhost variants automatically
if (process.env.NODE_ENV === "development") {
  defaultOrigins.push(
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://[::1]:5173"
  );
}

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  cors({
    origin: (origin, cb) => {
      // In development, allow any origin so local testing never fails
      if (process.env.NODE_ENV === "development") {
        return cb(null, true);
      }
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("CORS: origin not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type",
  "Authorization",
  "Accept",
  "Origin",
  "X-Requested-With",
  "X-CSRF-Token"],
  })
);

// respond to pre‑flight quickly
app.options("*", cors());

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
  // Connect to MongoDB first
  await connectDB();
  console.log('Database connection established');
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
  const port = 5002;
  
  // Use different listen options based on environment
  const listenOptions = process.env.NODE_ENV === "development"
    ? { port, host: "localhost" }  // Simplified for local development
    : { port, host: "0.0.0.0", reusePort: true };  // Full options for production
    
  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
