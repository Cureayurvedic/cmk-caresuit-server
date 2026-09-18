import http from "http";
import app from "./app.js";
import { env, logger, connectDatabase, disconnectDatabase } from "./config/index.js";

// ─── Local Development Server ─────────────────────────────────────────────────
// Vercel deployments use api/index.js as the serverless entry point.
// This file is only used for local development (npm run dev).
// ─────────────────────────────────────────────────────────────────────────────

process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", err);
  process.exit(1);
});

await connectDatabase();

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

