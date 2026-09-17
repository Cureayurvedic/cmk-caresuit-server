import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import patientRoutes from "../modules/patients/patient.routes.js";
import billingRoutes from "../modules/billing/billing.routes.js";
import reportsRoutes from "../modules/reports/reports.routes.js";
import atdRoutes from "../modules/atd/atd.routes.js";
import settingsRoutes from "../modules/settings/settings.routes.js";
import usersRoutes from "../modules/users/users.routes.js";
import accessoriesRoutes from "../modules/accessories/accessories.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/patients", patientRoutes);
router.use("/billing", billingRoutes);
router.use("/reports", reportsRoutes);
router.use("/atd", atdRoutes);
router.use("/settings", settingsRoutes);
router.use("/users", usersRoutes);
router.use("/accessories", accessoriesRoutes);

export default router;



