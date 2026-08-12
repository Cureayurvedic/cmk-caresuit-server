import { PatientRepository } from "./patient.repository.js";
import { NotFoundError, ConflictError } from "../../utils/errors.js";

export class PatientService {
  static async listPatients(queryParams) {
    const { patients, total } = await PatientRepository.findAndCountAll(queryParams);
    return {
      patients,
      total,
      page: queryParams.page,
      limit: queryParams.limit,
      pages: Math.ceil(total / queryParams.limit),
    };
  }

  static async getPatientById(id) {
    const patient = await PatientRepository.findById(id);
    if (!patient) {
      throw new NotFoundError(`Patient with ID ${id} not found.`);
    }
    return patient;
  }

  static async registerPatient(patientData) {
    // Aadhaar uniqueness check
    if (patientData.aadhaarCard) {
      const existing = await PatientRepository.findAndCountAll({
        search: patientData.aadhaarCard,
        page: 1,
        limit: 5,
      });
      const matchingAadhaar = existing.patients.find(
        (p) => p.aadhaarCard === patientData.aadhaarCard
      );
      if (matchingAadhaar) {
        throw new ConflictError(
          `A patient with Aadhaar number ${patientData.aadhaarCard} is already registered.`
        );
      }
    }

    // Compile fullName from name components
    const nameParts = [patientData.firstName, patientData.middleName, patientData.lastName].filter(Boolean);
    patientData.fullName = nameParts.join(" ");

    // Handle date formatting for dob
    if (patientData.dob) {
      patientData.dob = new Date(patientData.dob);
    } else {
      patientData.dob = null;
    }

    // Generate unique sequential UHID if not provided
    if (!patientData.uhid) {
      const year = new Date().getFullYear();
      const count = await PatientRepository.count();
      const seq = String(count + 1).padStart(5, "0");
      const rand = Math.floor(1000 + Math.random() * 9000);
      patientData.uhid = `UHID-${year}-${seq}-${rand}`;
    }

    return await PatientRepository.create(patientData);
  }

  static async updatePatient(id, updateData) {
    // Ensure patient exists first
    await this.getPatientById(id);

    // Aadhaar uniqueness check for updates
    if (updateData.aadhaarCard) {
      const existing = await PatientRepository.findAndCountAll({
        search: updateData.aadhaarCard,
        page: 1,
        limit: 5,
      });
      const matchingAadhaar = existing.patients.find(
        (p) => p.aadhaarCard === updateData.aadhaarCard && p.id !== id
      );
      if (matchingAadhaar) {
        throw new ConflictError(
          `Another patient with Aadhaar number ${updateData.aadhaarCard} is already registered.`
        );
      }
    }

    // Re-compile fullName if name parts are being modified
    if (updateData.firstName !== undefined || updateData.middleName !== undefined || updateData.lastName !== undefined) {
      const current = await this.getPatientById(id);
      const first = updateData.firstName !== undefined ? updateData.firstName : current.firstName;
      const middle = updateData.middleName !== undefined ? updateData.middleName : current.middleName;
      const last = updateData.lastName !== undefined ? updateData.lastName : current.lastName;

      const nameParts = [first, middle, last].filter(Boolean);
      updateData.fullName = nameParts.join(" ");
    }

    // Handle date formatting for dob updates
    if (updateData.dob) {
      updateData.dob = new Date(updateData.dob);
    }

    return await PatientRepository.update(id, updateData);
  }

  static async deletePatient(id) {
    await this.getPatientById(id);
    await PatientRepository.delete(id);
  }
}

export default PatientService;
