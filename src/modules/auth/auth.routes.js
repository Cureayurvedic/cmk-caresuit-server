import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { registerSchema, loginSchema } from "./auth.validator.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { protect } from "../../middlewares/auth.middleware.js";
import { authLimiter } from "../../middlewares/rateLimit.middleware.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), AuthController.register);
router.post("/login", authLimiter, validate(loginSchema), AuthController.login);
router.get("/me", protect, AuthController.getMe);

export default router;
