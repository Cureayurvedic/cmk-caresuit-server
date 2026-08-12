import { env, logger } from "../config/index.js";
import { AppError } from "../utils/errors.js";

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const match = err.message.match(/(["'])(\\?.)*?\1/);
  const value = match ? match[0] : "";
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 409);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () => {
  return new AppError("Invalid token. Please log in again!", 401);
};

const handleJWTExpiredError = () => {
  return new AppError("Your token has expired! Please log in again.", 401);
};

const sendErrorDev = (err, req, res) => {
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      status: err.status || "error",
      details: err.details || [],
      stack: err.stack,
    },
  });
};

const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    logger.warn(`Operational Error [${err.code || "UNKNOWN"}]: ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: {
        code: err.code || "ERROR",
        details: err.details || [],
      },
    });
  }

  // Critical programming or systems failure
  logger.error("❌ Critical Unknown Error:", err);
  return res.status(500).json({
    success: false,
    message: "Something went wrong! Please try again later.",
    error: {
      code: "INTERNAL_SERVER_ERROR",
    },
  });
};

export const errorMiddleware = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;
    error.isOperational = err.isOperational;
    error.code = err.code;
    error.details = err.details;

    if (err.name === "CastError") {
      error = handleCastErrorDB(error);
    }
    if (err.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (err.name === "ValidationError") {
      error = handleValidationErrorDB(error);
    }
    if (err.name === "JsonWebTokenError") {
      error = handleJWTError();
    }
    if (err.name === "TokenExpiredError") {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, req, res);
  }
};

export default errorMiddleware;
