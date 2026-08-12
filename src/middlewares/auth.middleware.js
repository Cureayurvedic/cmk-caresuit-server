import jwt from "jsonwebtoken";
import { env } from "../config/index.js";
import { AuthenticationError, AuthorizationError } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/database.js";

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AuthenticationError("Not authenticated. Please provide a Bearer token."));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Fetch user from PostgreSQL using Prisma Client
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return next(new AuthenticationError("The user belonging to this token no longer exists."));
    }

    if (user.status === "Inactive") {
      return next(new AuthorizationError("Your account has been deactivated. Please contact support."));
    }

    const userResponse = { ...user };
    delete userResponse.password;

    req.user = userResponse;
    next();
  } catch {
    return next(new AuthenticationError("Invalid or expired authentication token."));
  }
});

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AuthorizationError(
          `User role '${req.user ? req.user.role : "none"}' is not authorized to access this resource`
        )
      );
    }
    next();
  };
};
