import { Router } from "express";
import { ReportsController } from "./reports.controller.js";

const router = Router();

router.get("/revenue", ReportsController.getRevenueReport);
router.get("/collections", ReportsController.getCollectionsReport);
router.get("/bill-register", ReportsController.getBillRegisterReport);
router.get("/atd-census", ReportsController.getAtdCensusReport);
router.get("/outstanding", ReportsController.getOutstandingReport);
router.get("/refunds-credit", ReportsController.getRefundsCreditReport);

export default router;
