import http from "http";
import app from "./app.js";
import { env, logger, connectDatabase, disconnectDatabase } from "./config/index.js";

// Handle uncaught exceptions (synchronous process-level failures)
process.on("uncaughtException", (err) => {
  // Use logger.error, which is synchronous-safe for Winston console
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down process...", err);
  process.exit(1);
});

// Connect to the Database
await connectDatabase();

const server = http.createServer(app);

// Start the Server
server.listen(env.PORT, () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

// Handle unhandled promise rejections (asynchronous process-level failures)
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down gracefully...", err);
  server.close(() => {
    disconnectDatabase().finally(() => {
      process.exit(1);
    });
  });
});

// Centralized Graceful Shutdown Function
const gracefulShutdown = (signal) => {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info("HTTP server closed.");
    try {
      await disconnectDatabase();
      logger.info("Graceful shutdown completed. Exiting process.");
      process.exit(0);
    } catch (err) {
      logger.error(`Error during database disconnect: ${err.message}`);
      process.exit(1);
    }
  });

  // Enforce termination if resources don't release in time
  setTimeout(() => {
    logger.error("Forced exit: Graceful shutdown timed out.");
    process.exit(1);
  }, 10000);
};

// Register Graceful Shutdown Listeners
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
