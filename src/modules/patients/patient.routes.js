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
    authorize("Admin", "Operator"),
    PatientController.importBulk
  );

router.route("/")
  .get(
    authorize("Admin", "Operator"),
    validate(queryPatientSchema, "query"),
    PatientController.list
  )
  .post(
    authorize("Admin", "Operator"),
    validate(createPatientSchema),
    PatientController.create
  );

router.route("/:id")
  .get(
    authorize("Admin", "Operator"),
    PatientController.get
  )
  .put(
    authorize("Admin", "Operator"),
    validate(updatePatientSchema),
    PatientController.update
  )
  .delete(
    authorize("Admin"),
    PatientController.delete
  );

export default router;
