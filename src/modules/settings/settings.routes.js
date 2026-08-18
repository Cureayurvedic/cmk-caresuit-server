import { Router } from "express";
import { SettingsController } from "./settings.controller.js";
import { BedCategoryController } from "./bedCategory.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// All settings routes require authentication
router.use(protect);

// ──────────────────────────────────────────────────────────────────────────────
// Bed Category Routes  →  /api/v1/settings/bed-categories
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  "/bed-categories",
  authorize("Admin", "Doctor", "Nurse", "Receptionist"),
  BedCategoryController.list
);
router.post(
  "/bed-categories",
  authorize("Admin"),
  BedCategoryController.create
);
router.patch(
  "/bed-categories/:id",
  authorize("Admin"),
  BedCategoryController.update
);
router.delete(
  "/bed-categories/:id",
  authorize("Admin"),
  BedCategoryController.delete
);

// ──────────────────────────────────────────────────────────────────────────────
// Master Option Routes  →  /api/v1/settings/:category
// ──────────────────────────────────────────────────────────────────────────────
/**
 * GET  /api/v1/settings/:category   — list items for a category (all roles)
 */
router.get(
  "/:category",
  authorize("Admin", "Doctor", "Nurse", "Receptionist"),
  SettingsController.list
);

/**
 * POST /api/v1/settings/:category   — add item (Admin only)
 * Body: { value: string }
 */
router.post(
  "/:category",
  authorize("Admin"),
  SettingsController.create
);

/**
 * DELETE /api/v1/settings/:category/:id  — delete item (Admin only)
 */
router.delete(
  "/:category/:id",
  authorize("Admin"),
  SettingsController.delete
);

export default router;
