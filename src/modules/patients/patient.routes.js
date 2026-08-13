import { Router } from "express";
import { PatientController } from "./patient.controller.js";
import { createPatientSchema, updatePatientSchema, queryPatientSchema } from "./patient.validator.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { protect, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

// Apply auth protection globally to all patient routes
router.use(protect);

router.route("/import")
  .post(
    authorize("Admin", "Receptionist"),
    PatientController.importBulk
  );

router.route("/")
  .get(
    authorize("Admin", "Doctor", "Nurse", "Receptionist"),
    validate(queryPatientSchema, "query"),
    PatientController.list
  )
  .post(
    authorize("Admin", "Receptionist"),
    validate(createPatientSchema),
    PatientController.create
  );

router.route("/:id")
  .get(
    authorize("Admin", "Doctor", "Nurse", "Receptionist"),
    PatientController.get
  )
  .put(
    authorize("Admin", "Receptionist"),
    validate(updatePatientSchema),
    PatientController.update
  )
  .delete(
    authorize("Admin"),
    PatientController.delete
  );

export default router;
