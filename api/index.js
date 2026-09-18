// Vercel serverless entry point
// Vercel automatically serves files in the api/ directory as serverless functions.
// This imports the Express app and DB initializer, then exports the app as the handler.

import app from "../src/app.js";
import { connectDatabase } from "../src/config/index.js";
import { logger } from "../src/config/logger.js";

// Initialize DB connection on cold start (cached for warm invocations)
connectDatabase().catch((err) => {
  logger.error("DB connection failed on cold start:", err.message);
});

export default app;
