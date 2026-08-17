import { prisma } from "../../config/database.js";
import { AppError, NotFoundError } from "../../utils/errors.js";

// In-memory / persistent bed state initialized to the exact hospital layout
let HOSPITAL_BEDS = [
  // DELUXE
  {
    id: "bed-dlx-01",
    bedNo: "DLX-01",
    category: "DELUXE",
    ward: "Floor 2 - Deluxe Wing",
    status: "House Keeping",
    patient: null,
    cleaningStartedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    tariffRate: 3500,
  },
  {
    id: "bed-dlx-02",
    bedNo: "DLX-02",
    category: "DELUXE",
    ward: "Floor 2 - Deluxe Wing",
    status: "Occupied",
    patient: {
      uhid: "UHID-2026-00001-2863",
      ipNo: "IP-2026/00142",
      name: "Utkarsh Ladla",
      genderAge: "Male/21 Yr",
      admissionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      doctor: "Dr. Abhishek Bansal 2273",
      department: "Internal Medicine",
      diagnosis: "Acute Gastroenteritis with Dehydration",
      billingCategory: "DELUXE ROOM / REGULAR",
      company: "CASH / CASH",
      mobile: "4354353453",
      advancePaid: 5000,
      runningBill: 12450,
    },
    tariffRate: 3500,
  },
  { id: "bed-dlx-03", bedNo: "DLX-03", category: "DELUXE", ward: "Floor 2 - Deluxe Wing", status: "Vacant", patient: null, tariffRate: 3500 },
  { id: "bed-dlx-04", bedNo: "DLX-04", category: "DELUXE", ward: "Floor 2 - Deluxe Wing", status: "Vacant", patient: null, tariffRate: 3500 },
  { id: "bed-dlx-05", bedNo: "DLX-05", category: "DELUXE", ward: "Floor 2 - Deluxe Wing", status: "Vacant", patient: null, tariffRate: 3500 },

  // GENERAL WARD
  {
    id: "bed-gen-01",
    bedNo: "GEN-01",
    category: "GENERAL",
    ward: "Ground Floor - General Ward",
    status: "Occupied",
    patient: {
      uhid: "UHID-2026-00002-3183",
      ipNo: "IP-2026/00143",
      name: "test test test",
      genderAge: "Male/2 Yr",
      admissionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      doctor: "Dr. Sameer Sen 3105",
      department: "Pediatrics",
      diagnosis: "Viral Pyrexia with Wheezing",
      billingCategory: "GENERAL WARD / REGULAR",
      company: "Star Health Insurance",
      mobile: "8899889988",
      advancePaid: 3000,
      runningBill: 6800,
    },
    tariffRate: 1200,
  },
  { id: "bed-gen-02", bedNo: "GEN-02", category: "GENERAL", ward: "Ground Floor - General Ward", status: "Vacant", patient: null, tariffRate: 1200 },
  { id: "bed-gen-03", bedNo: "GEN-03", category: "GENERAL", ward: "Ground Floor - General Ward", status: "Vacant", patient: null, tariffRate: 1200 },
  { id: "bed-gen-04", bedNo: "GEN-04", category: "GENERAL", ward: "Ground Floor - General Ward", status: "Vacant", patient: null, tariffRate: 1200 },
  { id: "bed-gen-05", bedNo: "GEN-05", category: "GENERAL", ward: "Ground Floor - General Ward", status: "Vacant", patient: null, tariffRate: 1200 },
  { id: "bed-gen-06", bedNo: "GEN-06", category: "GENERAL", ward: "Ground Floor - General Ward", status: "Vacant", patient: null, tariffRate: 1200 },
  { id: "bed-gen-07", bedNo: "GEN-07", category: "GENERAL", ward: "Ground Floor - General Ward", status: "Vacant", patient: null, tariffRate: 1200 },
  { id: "bed-gen-08", bedNo: "GEN-08", category: "GENERAL", ward: "Ground Floor - General Ward", status: "Vacant", patient: null, tariffRate: 1200 },
  { id: "bed-gen-09", bedNo: "GEN-09", category: "GENERAL", ward: "Ground Floor - General Ward", status: "Vacant", patient: null, tariffRate: 1200 },
  { id: "bed-gen-10", bedNo: "GEN-10", category: "GENERAL", ward: "Ground Floor - General Ward", status: "Vacant", patient: null, tariffRate: 1200 },

  // ICU
  { id: "bed-icu-01", bedNo: "ICU-01", category: "ICU", ward: "Floor 1 - Critical Care Unit", status: "Vacant", patient: null, tariffRate: 6500 },
  { id: "bed-icu-02", bedNo: "ICU-02", category: "ICU", ward: "Floor 1 - Critical Care Unit", status: "Vacant", patient: null, tariffRate: 6500 },
  { id: "bed-icu-03", bedNo: "ICU-03", category: "ICU", ward: "Floor 1 - Critical Care Unit", status: "Vacant", patient: null, tariffRate: 6500 },
  { id: "bed-icu-04", bedNo: "ICU-04", category: "ICU", ward: "Floor 1 - Critical Care Unit", status: "Vacant", patient: null, tariffRate: 6500 },
  { id: "bed-icu-05", bedNo: "ICU-05", category: "ICU", ward: "Floor 1 - Critical Care Unit", status: "Vacant", patient: null, tariffRate: 6500 },

  // SINGLE PRIVATE
  { id: "bed-pvt-01", bedNo: "PRIVATE-01", category: "SINGLE PRIVATE", ward: "Floor 3 - Private Wing", status: "Vacant", patient: null, tariffRate: 4500 },
  { id: "bed-pvt-02", bedNo: "PRIVATE-02", category: "SINGLE PRIVATE", ward: "Floor 3 - Private Wing", status: "Vacant", patient: null, tariffRate: 4500 },
  { id: "bed-pvt-03", bedNo: "PRIVATE-03", category: "SINGLE PRIVATE", ward: "Floor 3 - Private Wing", status: "Vacant", patient: null, tariffRate: 4500 },
  { id: "bed-pvt-04", bedNo: "PRIVATE-04", category: "SINGLE PRIVATE", ward: "Floor 3 - Private Wing", status: "Vacant", patient: null, tariffRate: 4500 },
  { id: "bed-pvt-05", bedNo: "PRIVATE-05", category: "SINGLE PRIVATE", ward: "Floor 3 - Private Wing", status: "Vacant", patient: null, tariffRate: 4500 },

  // TWIN SHARING
  { id: "bed-twn-01", bedNo: "TWIN-S-01", category: "TWIN SHARING", ward: "Floor 2 - Twin Sharing", status: "Vacant", patient: null, tariffRate: 2500 },
  { id: "bed-twn-02", bedNo: "TWIN-S-02", category: "TWIN SHARING", ward: "Floor 2 - Twin Sharing", status: "Vacant", patient: null, tariffRate: 2500 },
  { id: "bed-twn-03", bedNo: "TWIN-S-03", category: "TWIN SHARING", ward: "Floor 2 - Twin Sharing", status: "Vacant", patient: null, tariffRate: 2500 },
  { id: "bed-twn-04", bedNo: "TWIN-S-04", category: "TWIN SHARING", ward: "Floor 2 - Twin Sharing", status: "Vacant", patient: null, tariffRate: 2500 },
  { id: "bed-twn-05", bedNo: "TWIN-S-05", category: "TWIN SHARING", ward: "Floor 2 - Twin Sharing", status: "Vacant", patient: null, tariffRate: 2500 },
];

export class AtdService {
  // ─── LIST BEDS & FILTER MATRIX ───────────────────────────────────────────────
  static async listBeds(queryParams = {}) {
    const { category, status, search } = queryParams;
    let filtered = [...HOSPITAL_BEDS];

    if (category && category !== "All" && category !== "all") {
      filtered = filtered.filter((b) => b.category.toUpperCase() === category.toUpperCase());
    }

    if (status && status !== "All" && status !== "all") {
      filtered = filtered.filter((b) => b.status.toLowerCase() === status.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((b) => {
        if (b.bedNo.toLowerCase().includes(q)) return true;
        if (b.category.toLowerCase().includes(q)) return true;
        if (b.patient) {
          if (b.patient.name.toLowerCase().includes(q)) return true;
          if (b.patient.uhid.toLowerCase().includes(q)) return true;
          if (b.patient.ipNo.toLowerCase().includes(q)) return true;
          if (b.patient.doctor.toLowerCase().includes(q)) return true;
          if (b.patient.company.toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    // Compute live status counts across whole hospital
    const counts = {
      vacant: HOSPITAL_BEDS.filter((b) => b.status === "Vacant").length,
      occupied: HOSPITAL_BEDS.filter((b) => b.status === "Occupied").length,
      houseKeeping: HOSPITAL_BEDS.filter((b) => b.status === "House Keeping").length,
      retain: HOSPITAL_BEDS.filter((b) => b.status === "Retain").length,
      blocked: HOSPITAL_BEDS.filter((b) => b.status === "Blocked").length,
      underRepair: HOSPITAL_BEDS.filter((b) => b.status === "Under Repair").length,
      stillOnBed: HOSPITAL_BEDS.filter((b) => b.status === "Still On Bed/Discharge Approval").length,
      total: HOSPITAL_BEDS.length,
    };

    return {
      beds: filtered,
      counts,
    };
  }

  // ─── ADMIT PATIENT TO BED ───────────────────────────────────────────────────
  static async admitPatient(data) {
    const {
      bedId,
      bedNo,
      uhid,
      patientName,
      bookingNo = "",
      ipNo: customIpNo,
      admittingTeam = "General Medicine Team A",
      treatingConsultant = "Dr. Abhishek Bansal 2273",
      admittingDoctor = "Dr. Abhishek Bansal 2273",
      secondaryDoctor = "",
      referType = "Internal Provider",
      referBy = "Self",
      admissionType = "Elective",
      ward,
      bedCategory,
      billingCategory = "REGULAR",
      expectedDischargeDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      minAdvRequire = 0,
      estimatedAmt = 0,
      mlc = false,
      handleWithCare = false,
      source = "Direct Patient",
      payerType = "Direct Patient",
      payer = "CASH / CASH",
      sponsor = "",
      insuranceCompany = "",
      kinDetails = {},
      advancePaid = 0,
    } = data;

    const targetBed = HOSPITAL_BEDS.find((b) => b.id === bedId || b.bedNo === bedNo);
    if (!targetBed) {
      throw new NotFoundError(`Bed with ID/No ${bedId || bedNo} not found.`);
    }

    if (targetBed.status === "Occupied") {
      throw new AppError(`Bed ${targetBed.bedNo} is already occupied.`, 400);
    }

    const ipNo = customIpNo || `IP-${new Date().getFullYear()}/${(HOSPITAL_BEDS.filter((b) => b.patient).length + 144).toString()}`;

    targetBed.status = "Occupied";
    targetBed.patient = {
      uhid: uhid || `UHID-${new Date().getFullYear()}-0000${Math.floor(Math.random() * 89) + 10}`,
      ipNo,
      bookingNo: bookingNo || `BKG-${Math.floor(Math.random() * 89999) + 10000}`,
      name: patientName || "Admitted Patient",
      genderAge: `${kinDetails.gender || "Male"}/${kinDetails.dob ? "30 Yr" : "35 Yr"}`,
      admissionDate: new Date().toISOString(),
      admittingTeam,
      treatingConsultant,
      doctor: admittingDoctor || treatingConsultant,
      secondaryDoctor,
      referType,
      referBy,
      admissionType,
      ward: ward || targetBed.ward,
      category: bedCategory || targetBed.category,
      billingCategory: `${targetBed.category} / ${billingCategory}`,
      expectedDischargeDate,
      minAdvRequire: Number(minAdvRequire || 0),
      estimatedAmt: Number(estimatedAmt || 0),
      mlc: Boolean(mlc),
      handleWithCare: Boolean(handleWithCare),
      source,
      payerType,
      company: payer || "CASH / CASH",
      sponsor,
      insuranceCompany,
      kinDetails,
      mobile: kinDetails.mobile || "9876543210",
      advancePaid: Number(advancePaid || minAdvRequire || targetBed.tariffRate || 0),
      runningBill: Number(targetBed.tariffRate || 2000),
    };

    // Update patient status in database if exists
    try {
      await prisma.patient.updateMany({
        where: { uhid: targetBed.patient.uhid },
        data: {
          status: "Open",
          occupation: targetBed.bedNo,
          registrationType: "Inpatient",
        },
      });
    } catch {
      // Non-blocking
    }

    return targetBed;
  }

  // ─── TRANSFER PATIENT TO ANOTHER BED ────────────────────────────────────────
  static async transferPatient(data) {
    const { fromBedNo, toBedNo, reason = "Medical condition upgrade" } = data;

    const sourceBed = HOSPITAL_BEDS.find((b) => b.bedNo === fromBedNo);
    const targetBed = HOSPITAL_BEDS.find((b) => b.bedNo === toBedNo);

    if (!sourceBed || !sourceBed.patient) {
      throw new AppError(`Source bed ${fromBedNo} has no active admitted patient.`, 400);
    }

    if (!targetBed) {
      throw new NotFoundError(`Target bed ${toBedNo} not found.`);
    }

    if (targetBed.status === "Occupied") {
      throw new AppError(`Target bed ${toBedNo} is already occupied.`, 400);
    }

    const patient = { ...sourceBed.patient };
    patient.billingCategory = `${targetBed.category} / REGULAR`;

    // Move patient
    targetBed.status = "Occupied";
    targetBed.patient = patient;

    // Set source bed to House Keeping for sanitation
    sourceBed.status = "House Keeping";
    sourceBed.patient = null;
    sourceBed.cleaningStartedAt = new Date().toISOString();

    // Update patient record bed assignment
    try {
      await prisma.patient.updateMany({
        where: { uhid: patient.uhid },
        data: { occupation: targetBed.bedNo },
      });
    } catch {
      // Non-blocking
    }

    return {
      sourceBed,
      targetBed,
      message: `Patient ${patient.name} successfully transferred from ${fromBedNo} to ${toBedNo}. Reason: ${reason}`,
    };
  }

  // ─── INITIATE DISCHARGE / MARK FOR DISCHARGE ────────────────────────────────
  static async initiateDischarge(data) {
    const { bedNo, dischargeNotes = "Recovered and fit for discharge" } = data;
    const targetBed = HOSPITAL_BEDS.find((b) => b.bedNo === bedNo);

    if (!targetBed || !targetBed.patient) {
      throw new AppError(`Bed ${bedNo} has no active admitted patient.`, 400);
    }

    // Set status to Still On Bed / Discharge Approval
    targetBed.status = "Still On Bed/Discharge Approval";
    targetBed.dischargeInitiatedAt = new Date().toISOString();
    targetBed.dischargeNotes = dischargeNotes;

    // Update patient status in DB
    try {
      await prisma.patient.updateMany({
        where: { uhid: targetBed.patient.uhid },
        data: { status: "Marked For Discharged" },
      });
    } catch {
      // Non-blocking
    }

    return targetBed;
  }

  // ─── COMPLETE DISCHARGE & SEND BED TO HOUSEKEEPING ──────────────────────────
  static async completeDischarge(data) {
    const { bedNo } = data;
    const targetBed = HOSPITAL_BEDS.find((b) => b.bedNo === bedNo);

    if (!targetBed) {
      throw new NotFoundError(`Bed ${bedNo} not found.`);
    }

    const patient = targetBed.patient;
    targetBed.status = "House Keeping";
    targetBed.patient = null;
    targetBed.cleaningStartedAt = new Date().toISOString();

    if (patient) {
      try {
        await prisma.patient.updateMany({
          where: { uhid: patient.uhid },
          data: { status: "Discharged" },
        });
      } catch {
        // Non-blocking
      }
    }

    return targetBed;
  }

  // ─── UPDATE BED STATUS (E.G. HOUSEKEEPING -> VACANT, BLOCKED, UNDER REPAIR) ──
  static async updateBedStatus(data) {
    const { bedNo, status, notes = "" } = data;
    const targetBed = HOSPITAL_BEDS.find((b) => b.bedNo === bedNo);

    if (!targetBed) {
      throw new NotFoundError(`Bed ${bedNo} not found.`);
    }

    if (status === "Vacant") {
      targetBed.status = "Vacant";
      targetBed.patient = null;
      targetBed.cleaningStartedAt = null;
    } else if (status === "House Keeping") {
      targetBed.status = "House Keeping";
      targetBed.cleaningStartedAt = new Date().toISOString();
    } else if (status === "Blocked" || status === "Under Repair" || status === "Retain") {
      targetBed.status = status;
      targetBed.notes = notes;
    }

    return targetBed;
  }
}
