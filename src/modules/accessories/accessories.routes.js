import { Router } from "express";
import { AccessoriesController } from "./accessories.controller.js";
import { createAccessorySchema, updateAccessorySchema, queryAccessorySchema, adjustStockSchema } from "./accessories.validator.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// Apply auth protection globally to all accessories routes
router.use(protect);

// Bulk import accessories
router.route("/import")
  .post(
    authorize("Admin", "Operator"),
    AccessoriesController.importBulk
  );

// List and create accessories
router.route("/")
  .get(
    authorize("Admin", "Operator"),
    validate(queryAccessorySchema, "query"),
    AccessoriesController.list
  )
  .post(
    authorize("Admin", "Operator"),
    validate(createAccessorySchema),
    AccessoriesController.create
  );

// Get, update, delete specific accessory
router.route("/:id")
  .get(
    authorize("Admin", "Operator"),
    AccessoriesController.get
  )
  .put(
    authorize("Admin", "Operator"),
    validate(updateAccessorySchema),
    AccessoriesController.update
  )
  .delete(
    authorize("Admin"),
    AccessoriesController.delete
  );

// Adjust stock for specific size
router.route("/:id/stock")
  .patch(
    authorize("Admin", "Operator"),
    validate(adjustStockSchema),
    AccessoriesController.adjustStock
  );

export default router;
