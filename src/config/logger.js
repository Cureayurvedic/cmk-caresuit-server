import winston from "winston";
import { env } from "./env.js";

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Custom console format for development
const devFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  levels,
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true })
  ),
  transports: [
    // Output error logs to a separate file
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: json(),
    }),
    // Output all logs to a general application log file
    new winston.transports.File({
      filename: "logs/app.log",
      format: json(),
    }),
  ],
});

// Configure Console Transport
if (env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        devFormat
      ),
    })
  );
} else {
  // JSON console logs in production
  logger.add(
    new winston.transports.Console({
      format: combine(
        json()
      ),
    })
  );
}

export { logger };
export default logger;
