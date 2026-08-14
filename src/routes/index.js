import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import patientRoutes from "../modules/patients/patient.routes.js";
import billingRoutes from "../modules/billing/billing.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/patients", patientRoutes);
router.use("/billing", billingRoutes);

export default router;
