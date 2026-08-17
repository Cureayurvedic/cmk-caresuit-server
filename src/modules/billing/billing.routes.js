import { Router } from "express";
import { BillingController } from "./billing.controller.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// Apply auth protection globally to all billing routes
router.use(protect);

// Seeding & Stats
router.route("/seed")
  .post(BillingController.seed);

router.route("/stats")
  .get(BillingController.getStats);

// Invoices
router.route("/invoices")
  .get(BillingController.list)
  .post(BillingController.create);

router.route("/invoices/settle")
  .post(BillingController.settle);

router.route("/invoices/cancel/:id")
  .post(BillingController.cancel);

router.route("/invoices/:id")
  .get(BillingController.getById);

// Receipts & Cashbook Ledger
router.route("/receipts")
  .get(BillingController.listReceipts);

// Patients Census & Lookup
router.route("/patients")
  .get(BillingController.listPatients);

// OP Visits
router.route("/visits")
  .get(BillingController.listVisits)
  .post(BillingController.createVisit);

// Orders & Unbilled Orders
router.route("/orders")
  .get(BillingController.listOrders)
  .post(BillingController.createOrder);

router.route("/orders/:id/bill")
  .post(BillingController.billOrder);

// Advances / Deposits
router.route("/advances")
  .get(BillingController.listAdvances)
  .post(BillingController.createAdvance);

// Credit Notes
router.route("/credit-notes")
  .get(BillingController.listCreditNotes)
  .post(BillingController.createCreditNote);

// Refunds
router.route("/refunds")
  .get(BillingController.listRefunds)
  .post(BillingController.createRefund);

// Insurance Claims Intimations
router.route("/intimations")
  .get(BillingController.listIntimations)
  .post(BillingController.createIntimation);

router.route("/intimations/:id")
  .put(BillingController.updateIntimation);

export default router;
