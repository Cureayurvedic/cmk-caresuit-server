import app from "./app.js";
import { env, logger, connectDatabase, disconnectDatabase } from "./config/index.js";

// ─── Database Initialization ──────────────────────────────────────────────────
// On Vercel: runs once per cold start, then cached for warm invocations.
// Any connection errors surface per-request through Express's error middleware,
// which already has CORS headers applied — so the browser won't see a CORS error.
// ─────────────────────────────────────────────────────────────────────────────
connectDatabase().catch((err) => {
  logger.error("Initial DB connection failed (will retry on first request):", err.message);
});

// ─── Local Development Server ─────────────────────────────────────────────────
// On Vercel, VERCEL=1 is injected automatically — skip http.listen entirely.
// ─────────────────────────────────────────────────────────────────────────────
if (process.env.VERCEL !== "1") {
  const { default: http } = await import("http");

  process.on("uncaughtException", (err) => {
    logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down process...", err);
    process.exit(1);
  });

  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  process.on("unhandledRejection", (err) => {
    logger.error("UNHANDLED REJECTION! 💥 Shutting down gracefully...", err);
    server.close(() => {
      disconnectDatabase().finally(() => process.exit(1));
    });
  });

  const gracefulShutdown = (signal) => {
    logger.warn(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      try {
        await disconnectDatabase();
        logger.info("Graceful shutdown completed.");
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
// Vercel invokes this directly. Express handles CORS before any route logic.
// ─────────────────────────────────────────────────────────────────────────────
export default app;
