import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

export const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "query" },
    { emit: "event", level: "info" },
    { emit: "event", level: "warn" },
    { emit: "event", level: "error" },
  ],
});

prisma.$on("query", (e) => {
  logger.debug(`Prisma Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
});

prisma.$on("info", (e) => {
  logger.info(e.message);
});

prisma.$on("warn", (e) => {
  logger.warn(e.message);
});

prisma.$on("error", (e) => {
  logger.error(e.message);
});

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connection established successfully via Prisma.");
  } catch (error) {
    logger.error(`Initial database connection failure: ${error.message}`);
    throw error;
  }
};

export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    logger.info("Database connection closed successfully via Prisma.");
  } catch (error) {
    logger.error(`Error closing database connection: ${error.message}`);
    throw error;
  }
};
