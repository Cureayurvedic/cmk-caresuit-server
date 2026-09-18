import app from "./app.js";
import { env, logger, connectDatabase, disconnectDatabase } from "./config/index.js";

// ─── Vercel Serverless Export ─────────────────────────────────────────────────
// Vercel handles the HTTP layer; we just export the Express app.
// connectDatabase() is called lazily so the cold start doesn't block the export.
// ─────────────────────────────────────────────────────────────────────────────

let dbConnected = false;

const ensureDb = async () => {
  if (!dbConnected) {
    await connectDatabase();
    dbConnected = true;
  }
};

// Wrap the app so DB connects on first request (serverless-safe)
const handler = async (req, res) => {
  try {
    await ensureDb();
  } catch (err) {
    logger.error("Database connection failed on cold start", err);
    res.status(503).json({ success: false, message: "Service temporarily unavailable." });
    return;
  }
  app(req, res);
};

// ─── Local Development Server ────────────────────────────────────────────────
// Only start an HTTP server when running locally (not on Vercel).
// ─────────────────────────────────────────────────────────────────────────────
if (process.env.VERCEL !== "1") {
  import("http").then(({ default: http }) => {
    process.on("uncaughtException", (err) => {
      logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down process...", err);
      process.exit(1);
    });

    connectDatabase()
      .then(() => {
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
      })
      .catch((err) => {
        logger.error("Failed to connect to database on startup", err);
        process.exit(1);
      });
  });
}

// Export for Vercel serverless
export default handler;
