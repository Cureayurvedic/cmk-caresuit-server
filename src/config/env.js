/* eslint-disable no-console */
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("*"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),
});

// Run validation
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error("❌ Environment configuration validation failed:");
  parseResult.error.issues.forEach((issue) => {
    console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parseResult.data;
export default env;
