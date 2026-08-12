import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import patientRoutes from "../modules/patients/patient.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/patients", patientRoutes);

export default router;
