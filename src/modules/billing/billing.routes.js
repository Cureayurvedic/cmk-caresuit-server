import { Router } from "express";
import { BillingController } from "./billing.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// Apply auth protection globally to all billing routes
router.use(protect);

router.route("/seed")
  .post(
    authorize("Admin"),
    BillingController.seed
  );

router.route("/invoices")
  .get(
    authorize("Admin", "Doctor", "Nurse", "Receptionist"),
    BillingController.list
  );

router.route("/invoices/settle")
  .post(
    authorize("Admin", "Receptionist"),
    BillingController.settle
  );

router.route("/invoices/cancel/:id")
  .post(
    authorize("Admin"),
    BillingController.cancel
  );

export default router;
