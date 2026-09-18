import http from "http";
import app from "./app.js";
import { env, logger, connectDatabase, disconnectDatabase } from "./config/index.js";

// ─── Database Initialization ──────────────────────────────────────────────────
// Runs once per cold start on Vercel, cached for warm invocations.
// Errors surface through Express's error middleware (which already has CORS
// headers), so the browser never sees a raw CORS error on DB failure.
// ─────────────────────────────────────────────────────────────────────────────
connectDatabase().catch((err) => {
  logger.error("Initial DB connection failed:", err.message);
});

// ─── Local Development Server ─────────────────────────────────────────────────
// Vercel automatically sets VERCEL=1 — skip http.listen on serverless.
// ─────────────────────────────────────────────────────────────────────────────
if (process.env.VERCEL !== "1") {
  process.on("uncaughtException", (err) => {
    logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", err);
    process.exit(1);
  });

  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  process.on("unhandledRejection", (err) => {
    logger.error("UNHANDLED REJECTION! 💥 Shutting down...", err);
    server.close(() => disconnectDatabase().finally(() => process.exit(1)));
  });

  const gracefulShutdown = (signal) => {
    logger.warn(`Received ${signal}. Graceful shutdown...`);
    server.close(async () => {
      try {
        await disconnectDatabase();
        process.exit(0);
      } catch (err) {
        logger.error(`Error closing DB: ${err.message}`);
        process.exit(1);
      }
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

// ─── Vercel Serverless Export ─────────────────────────────────────────────────
// Vercel invokes this. Express CORS middleware runs before any route logic.
// ─────────────────────────────────────────────────────────────────────────────
export default app;

