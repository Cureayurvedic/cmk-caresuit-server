import { prisma } from "../../config/database.js";
import { AppError, NotFoundError } from "../../utils/errors.js";
import { BedCategoryRepository } from "../settings/bedCategory.repository.js";

// ─── Helpers ────────────────────────────────────────────────────────────────
function parseBed(b) {
  return {
    id:                b.id,
    bedNo:             b.bedNo,
    category:          b.category?.name  ?? b.categoryName ?? "GENERAL",
    categoryId:        b.categoryId,
    ward:              b.category?.ward  ?? "",
    tariffRate:        b.category?.tariffRate ?? 2000,
    status:            b.status,
    patient:           b.patientJson ? JSON.parse(b.patientJson) : null,
    notes:             b.notes       ?? null,
    cleaningStartedAt: b.cleaningStartedAt ?? null,
  };
}

async function findBed(bedNoOrId) {
  const byNo = await prisma.bed.findUnique({ where: { bedNo: bedNoOrId },    include: { category: true } });
  if (byNo) return byNo;
  return  await prisma.bed.findUnique({ where: { id: bedNoOrId },            include: { category: true } });
}

export class AtdService {
  // ─── LIST BEDS & FILTER MATRIX ───────────────────────────────────────────────
  static async listBeds(queryParams = {}) {
    const { category, status, search } = queryParams;

    // Auto-seed defaults on very first call if DB is empty
    const totalBeds = await prisma.bed.count();
    if (totalBeds === 0) {
      await BedCategoryRepository.seedDefaults();
    }

    const where = {};
    if (category && category !== "All" && category !== "all") {
      where.category = { name: { equals: category.toUpperCase(), mode: "insensitive" } };
    }
    if (status && status !== "All" && status !== "all") {
      where.status = { equals: status, mode: "insensitive" };
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { bedNo:        { contains: q, mode: "insensitive" } },
        { patientJson:  { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const beds = await prisma.bed.findMany({
      where,
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { bedNo: "asc" }],
    });

    const allBeds = await prisma.bed.findMany({ select: { status: true } });
    const counts = {
      vacant:      allBeds.filter((b) => b.status === "Vacant").length,
      occupied:    allBeds.filter((b) => b.status === "Occupied").length,
      houseKeeping:allBeds.filter((b) => b.status === "House Keeping").length,
      retain:      allBeds.filter((b) => b.status === "Retain").length,
      blocked:     allBeds.filter((b) => b.status === "Blocked").length,
      underRepair: allBeds.filter((b) => b.status === "Under Repair").length,
      stillOnBed:  allBeds.filter((b) => b.status === "Still On Bed/Discharge Approval").length,
      total:       allBeds.length,
    };

    return { beds: beds.map(parseBed), counts };
  }

  // ─── ADMIT PATIENT TO BED ───────────────────────────────────────────────────
  static async admitPatient(data) {
    const {
      bedId, bedNo, uhid, patientName,
      bookingNo = "", ipNo: customIpNo,
      admittingTeam = "General Medicine Team A",
      treatingConsultant = "Dr. Abhishek Bansal 2273",
      admittingDoctor = "Dr. Abhishek Bansal 2273",
      secondaryDoctor = "", referType = "Internal Provider",
      referBy = "Self", admissionType = "Elective",
      ward, bedCategory, billingCategory = "REGULAR",
      expectedDischargeDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      minAdvRequire = 0, estimatedAmt = 0,
      mlc = false, handleWithCare = false,
      source = "Direct Patient", payerType = "Direct Patient",
      payer = "CASH / CASH", sponsor = "", insuranceCompany = "",
      kinDetails = {}, advancePaid = 0,
    } = data;

    const targetBed = await findBed(bedId || bedNo);
    if (!targetBed) throw new NotFoundError(`Bed with ID/No ${bedId || bedNo} not found.`);
    if (targetBed.status === "Occupied") throw new AppError(`Bed ${targetBed.bedNo} is already occupied.`, 400);

    const occupiedCount = await prisma.bed.count({ where: { status: "Occupied" } });
    const ipNo = customIpNo || `IP-${new Date().getFullYear()}/${(occupiedCount + 144).toString()}`;

    const patient = {
      uhid:            uhid || `UHID-${new Date().getFullYear()}-0000${Math.floor(Math.random() * 89) + 10}`,
      ipNo,
      bookingNo:       bookingNo || `BKG-${Math.floor(Math.random() * 89999) + 10000}`,
      name:            patientName || "Admitted Patient",
      genderAge:       `${kinDetails.gender || "Male"}/${kinDetails.dob ? "30 Yr" : "35 Yr"}`,
      admissionDate:   new Date().toISOString(),
      admittingTeam,   treatingConsultant,
      doctor:          admittingDoctor || treatingConsultant,
      secondaryDoctor, referType, referBy, admissionType,
      ward:            ward || targetBed.category.ward,
      category:        bedCategory || targetBed.category.name,
      billingCategory: `${targetBed.category.name} / ${billingCategory}`,
      expectedDischargeDate,
      minAdvRequire:   Number(minAdvRequire || 0),
      estimatedAmt:    Number(estimatedAmt || 0),
      mlc:             Boolean(mlc),
      handleWithCare:  Boolean(handleWithCare),
      source, payerType,
      company:         payer || "CASH / CASH",
      sponsor, insuranceCompany, kinDetails,
      mobile:          kinDetails.mobile || "9876543210",
      advancePaid:     Number(advancePaid || minAdvRequire || targetBed.category.tariffRate || 0),
      runningBill:     Number(targetBed.category.tariffRate || 2000),
    };

    const updated = await prisma.bed.update({
      where: { id: targetBed.id },
      data:  { status: "Occupied", patientJson: JSON.stringify(patient) },
      include: { category: true },
    });

    // Update patient status in DB (non-blocking)
    prisma.patient.updateMany({ where: { uhid: patient.uhid }, data: { status: "Open", registrationType: "Inpatient" } }).catch(() => {});

    return parseBed(updated);
  }

  // ─── TRANSFER PATIENT TO ANOTHER BED ────────────────────────────────────────
  static async transferPatient(data) {
    const { fromBedNo, toBedNo, reason = "Medical condition upgrade" } = data;

    const sourceBed = await findBed(fromBedNo);
    const targetBed = await findBed(toBedNo);

    if (!sourceBed || !sourceBed.patientJson) throw new AppError(`Source bed ${fromBedNo} has no active admitted patient.`, 400);
    if (!targetBed)                            throw new NotFoundError(`Target bed ${toBedNo} not found.`);
    if (targetBed.status === "Occupied")       throw new AppError(`Target bed ${toBedNo} is already occupied.`, 400);

    const patient = JSON.parse(sourceBed.patientJson);
    patient.billingCategory = `${targetBed.category?.name || "GENERAL"} / REGULAR`;

    await prisma.$transaction([
      prisma.bed.update({ where: { id: targetBed.id }, data: { status: "Occupied", patientJson: JSON.stringify(patient) } }),
      prisma.bed.update({ where: { id: sourceBed.id }, data: { status: "House Keeping", patientJson: null, cleaningStartedAt: new Date() } }),
    ]);

    prisma.patient.updateMany({ where: { uhid: patient.uhid }, data: { occupation: toBedNo } }).catch(() => {});

    return {
      sourceBed: parseBed({ ...sourceBed, status: "House Keeping", patientJson: null }),
      targetBed: parseBed({ ...targetBed, status: "Occupied",      patientJson: JSON.stringify(patient) }),
      message: `Patient ${patient.name} transferred from ${fromBedNo} to ${toBedNo}. Reason: ${reason}`,
    };
  }

  // ─── INITIATE DISCHARGE ──────────────────────────────────────────────────────
  static async initiateDischarge(data) {
    const { bedNo, dischargeNotes = "Recovered and fit for discharge" } = data;
    const targetBed = await findBed(bedNo);
    if (!targetBed || !targetBed.patientJson) throw new AppError(`Bed ${bedNo} has no active admitted patient.`, 400);

    const updated = await prisma.bed.update({
      where:   { id: targetBed.id },
      data:    { status: "Still On Bed/Discharge Approval", notes: dischargeNotes },
      include: { category: true },
    });

    const patient = JSON.parse(targetBed.patientJson);
    prisma.patient.updateMany({ where: { uhid: patient.uhid }, data: { status: "Marked For Discharged" } }).catch(() => {});

    return parseBed(updated);
  }

  // ─── COMPLETE DISCHARGE ──────────────────────────────────────────────────────
  static async completeDischarge(data) {
    const { bedNo } = data;
    const targetBed = await findBed(bedNo);
    if (!targetBed) throw new NotFoundError(`Bed ${bedNo} not found.`);

    const patient = targetBed.patientJson ? JSON.parse(targetBed.patientJson) : null;

    const updated = await prisma.bed.update({
      where:   { id: targetBed.id },
      data:    { status: "House Keeping", patientJson: null, cleaningStartedAt: new Date(), notes: null },
      include: { category: true },
    });

    if (patient) {
      prisma.patient.updateMany({ where: { uhid: patient.uhid }, data: { status: "Discharged" } }).catch(() => {});
    }

    return parseBed(updated);
  }

  // ─── UPDATE BED STATUS ───────────────────────────────────────────────────────
  static async updateBedStatus(data) {
    const { bedNo, status, notes = "" } = data;
    const targetBed = await findBed(bedNo);
    if (!targetBed) throw new NotFoundError(`Bed ${bedNo} not found.`);

    const updateData = { status };
    if (status === "Vacant")        { updateData.patientJson = null; updateData.cleaningStartedAt = null; }
    if (status === "House Keeping") { updateData.cleaningStartedAt = new Date(); }
    if (notes)                      { updateData.notes = notes; }

    const updated = await prisma.bed.update({ where: { id: targetBed.id }, data: updateData, include: { category: true } });
    return parseBed(updated);
  }

  // ─── ADD NEW BED OR BULK BEDS ───────────────────────────────────────────────
  static async addBed(data) {
    const { bedNo, category, ward, tariffRate = 2000, status = "Vacant", bulkCount, prefix, startNumber } = data;

    // Find or create the category
    let cat = await prisma.bedCategory.findFirst({ where: { name: { equals: (category || "GENERAL").toUpperCase(), mode: "insensitive" } } });
    if (!cat) {
      cat = await prisma.bedCategory.create({
        data: {
          name:      (category || "GENERAL").toUpperCase(),
          prefix:    (prefix || "BED").toUpperCase(),
          ward:      ward || "General Ward",
          tariffRate: Number(tariffRate),
          totalBeds: 0,
          sortOrder: 99,
        },
      });
    }

    if (bulkCount && parseInt(bulkCount, 10) > 1) {
      const count = parseInt(bulkCount, 10);
      const start = parseInt(startNumber, 10) || 1;
      const pref  = (prefix || cat.prefix).toUpperCase();
      const created = [];
      for (let i = 0; i < count; i++) {
        const num = String(start + i).padStart(2, "0");
        const bNo = `${pref}-${num}`;
        try {
          const b = await prisma.bed.create({ data: { bedNo: bNo, categoryId: cat.id, status: "Vacant" }, include: { category: true } });
          created.push(parseBed(b));
        } catch { /* skip duplicates */ }
      }
      await prisma.bedCategory.update({ where: { id: cat.id }, data: { totalBeds: { increment: created.length } } });
      return { addedCount: created.length, beds: created };
    }

    if (!bedNo) throw new AppError("Bed number is required", 400);

    const b = await prisma.bed.create({
      data:    { bedNo: bedNo.toUpperCase(), categoryId: cat.id, status: status || "Vacant" },
      include: { category: true },
    });
    await prisma.bedCategory.update({ where: { id: cat.id }, data: { totalBeds: { increment: 1 } } });
    return parseBed(b);
  }

  // ─── DELETE BED ─────────────────────────────────────────────────────────────
  static async deleteBed(bedNo) {
    const targetBed = await findBed(bedNo);
    if (!targetBed) throw new NotFoundError(`Bed ${bedNo} not found.`);
    if (targetBed.status === "Occupied") throw new AppError(`Cannot delete Bed ${bedNo} while it is occupied.`, 400);

    await prisma.bed.delete({ where: { id: targetBed.id } });
    await prisma.bedCategory.update({ where: { id: targetBed.categoryId }, data: { totalBeds: { decrement: 1 } } });
    return parseBed(targetBed);
  }
}
