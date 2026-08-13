import { PatientService } from "./patient.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export class PatientController {
  static list = asyncHandler(async (req, res) => {
    const result = await PatientService.listPatients(req.query);

    res.status(200).json({
      success: true,
      message: "Patients list retrieved successfully",
      data: result,
    });
  });

  static get = asyncHandler(async (req, res) => {
    const patient = await PatientService.getPatientById(req.params.id);

    res.status(200).json({
      success: true,
      message: "Patient retrieved successfully",
      data: { patient },
    });
  });

  static create = asyncHandler(async (req, res) => {
    const patient = await PatientService.registerPatient(req.body);

    res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      data: { patient },
    });
  });

  static update = asyncHandler(async (req, res) => {
    const patient = await PatientService.updatePatient(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: "Patient record updated successfully",
      data: { patient },
    });
  });

  static delete = asyncHandler(async (req, res) => {
    await PatientService.deletePatient(req.params.id);

    res.status(200).json({
      success: true,
      message: "Patient record deleted successfully",
    });
  });

  static importBulk = asyncHandler(async (req, res) => {
    const patientsList = req.body.patients || req.body;
    const result = await PatientService.bulkImportPatients(patientsList);

    res.status(200).json({
      success: true,
      message: `Bulk import completed: ${result.insertedCount} inserted, ${result.skippedCount} skipped.`,
      data: result,
    });
  });
}

export default PatientController;
