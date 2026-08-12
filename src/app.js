import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";
import { AppError } from "./utils/errors.js";
import apiRoutes from "./routes/index.js";

const app = express();

// Trust proxy (needed for rate limiting behind a reverse proxy like Nginx)
app.set("trust proxy", 1);

// Global Security Middlewares
app.use(helmet());

// CORS Configuration
const corsOptions = {
  origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Rate Limiting for general API routes in production
if (env.NODE_ENV === "production") {
  app.use("/api", apiLimiter);
}

// Request Body Parsers (with safe size limits)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static folder if uploads are needed
app.use("/uploads", express.static("uploads"));

// API Routes
app.use("/api/v1", apiRoutes);

// Health Check Route
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// Catch-all for unhandled routes (404)
app.all("*", (req, _res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Centralized Error Handling Middleware
app.use(errorMiddleware);

export default app;
export { app };
