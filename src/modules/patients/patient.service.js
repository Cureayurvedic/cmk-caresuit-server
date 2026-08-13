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
      const d = new Date(patientData.dob);
      patientData.dob = !isNaN(d.getTime()) ? d : null;
    } else {
      patientData.dob = null;
    }

    // Handle date formatting for regDate
    if (patientData.regDate) {
      const rd = new Date(patientData.regDate);
      patientData.regDate = !isNaN(rd.getTime()) ? rd : new Date();
    } else {
      patientData.regDate = new Date();
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
      const d = new Date(updateData.dob);
      updateData.dob = !isNaN(d.getTime()) ? d : null;
    }

    // Handle date formatting for regDate updates
    if (updateData.regDate) {
      const rd = new Date(updateData.regDate);
      updateData.regDate = !isNaN(rd.getTime()) ? rd : new Date();
    }

    return await PatientRepository.update(id, updateData);
  }

  static async deletePatient(id) {
    await this.getPatientById(id);
    await PatientRepository.delete(id);
  }

  static async bulkImportPatients(patientsList) {
    if (!Array.isArray(patientsList) || patientsList.length === 0) {
      throw new Error("Invalid import data: Array of patient records required.");
    }

    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const insertedPatients = [];

    const year = new Date().getFullYear();
    let currentCount = await PatientRepository.count();

    for (let index = 0; index < patientsList.length; index++) {
      const p = { ...patientsList[index] };
      try {
        const firstName = String(p.firstName || p.name || p.fullName || "Patient").trim();
        const lastName = p.lastName ? String(p.lastName).trim() : "";
        const middleName = p.middleName ? String(p.middleName).trim() : "";
        const title = p.title || "Mr.";
        const gender = p.gender || "Male";
        const mobile = p.mobile || p.phone || p.contact || "0000000000";
        const address = p.address || "N/A";
        const state = p.state || "Delhi";
        const registrationType = p.registrationType || "New Registration";
        const guardianName = p.guardianName || `${firstName}'s Guardian`;
        const payerType = p.payerType || "direct";

        let uhid = p.uhid ? String(p.uhid).trim() : null;
        if (!uhid) {
          currentCount++;
          const seq = String(currentCount).padStart(5, "0");
          const rand = Math.floor(1000 + Math.random() * 9000);
          uhid = `UHID-${year}-${seq}-${rand}`;
        }

        if (p.uhid) {
          const existingUhid = await PatientRepository.findByUhid(uhid);
          if (existingUhid) {
            skippedCount++;
            errors.push(`Row ${index + 1}: UHID ${uhid} already exists.`);
            continue;
          }
        }

        const fullName = p.fullName || [firstName, middleName, lastName].filter(Boolean).join(" ");

        let dob = null;
        if (p.dob) {
          const d = new Date(p.dob);
          if (!isNaN(d.getTime())) {
            dob = d;
          }
        }

        let age = null;
        if (p.age !== undefined && p.age !== null) {
          const parsedAge = parseInt(String(p.age).replace(/\D/g, ""), 10);
          if (!isNaN(parsedAge)) age = parsedAge;
        }

        const patientRecord = {
          registrationType,
          uhid,
          title,
          firstName,
          middleName: middleName || null,
          lastName: lastName || null,
          fullName,
          gender,
          maritalStatus: p.maritalStatus || null,
          dob,
          age,
          guardianName,
          guardianRelation: p.guardianRelation || "Self",
          regDate: p.regDate ? new Date(p.regDate) : new Date(),
          mobile: String(mobile),
          address: String(address),
          country: p.country || "India",
          state: String(state),
          districtCity: p.districtCity || p.city || null,
          area: p.area || null,
          pinCode: p.pinCode ? String(p.pinCode) : null,
          altPhone: p.altPhone ? String(p.altPhone) : null,
          email: p.email || null,
          emergencyName: p.emergencyName || null,
          emergencyRelationship: p.emergencyRelationship || null,
          emergencyContact: p.emergencyContact ? String(p.emergencyContact) : null,
          nationality: p.nationality || "Indian",
          aadhaarCard: p.aadhaarCard ? String(p.aadhaarCard) : null,
          panNo: p.panNo ? String(p.panNo) : null,
          payerType,
          payer: p.payer || (payerType === "direct" ? "CASH" : null),
          sponsor: p.sponsor || null,
          provider: p.provider || null,
          leadSource: p.leadSource || null,
          referredType: p.referredType || null,
          referredBy: p.referredBy || null,
          hcf: p.hcf || null,
          status: p.status || "Active",
          remarks: p.remarks || null,
          religion: p.religion || null,
          occupation: p.occupation || null,
          isVip: Boolean(p.isVip),
          isAnimation: Boolean(p.isAnimation),
          nameMasking: Boolean(p.nameMasking),
          handleWithCare: Boolean(p.handleWithCare),
          sendPromoSms: Boolean(p.sendPromoSms),
          sendPromoEmail: Boolean(p.sendPromoEmail),
        };

        const created = await PatientRepository.create(patientRecord);
        insertedCount++;
        insertedPatients.push(created);
      } catch (err) {
        skippedCount++;
        errors.push(`Row ${index + 1}: ${err.message}`);
      }
    }

    return {
      totalRecords: patientsList.length,
      insertedCount,
      skippedCount,
      errors,
      insertedPatients,
    };
  }
}

export default PatientService;
