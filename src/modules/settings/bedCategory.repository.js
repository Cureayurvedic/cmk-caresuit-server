import { prisma } from "../../config/database.js";

// ─── Default hospital bed categories — seeded on first load ──────────────────
export const DEFAULT_BED_CATEGORIES = [
  { name: "DELUXE",        prefix: "DLX",     ward: "Floor 2 - Deluxe Wing",       tariffRate: 3500, totalBeds: 5, sortOrder: 0 },
  { name: "GENERAL",       prefix: "GEN",     ward: "Ground Floor - General Ward",  tariffRate: 1200, totalBeds: 10, sortOrder: 1 },
  { name: "ICU",           prefix: "ICU",     ward: "Floor 1 - Critical Care Unit", tariffRate: 6500, totalBeds: 5, sortOrder: 2 },
  { name: "SINGLE PRIVATE",prefix: "PRIVATE", ward: "Floor 3 - Private Wing",       tariffRate: 4500, totalBeds: 5, sortOrder: 3 },
  { name: "TWIN SHARING",  prefix: "TWIN-S",  ward: "Floor 2 - Twin Sharing",       tariffRate: 2500, totalBeds: 5, sortOrder: 4 },
];

export class BedCategoryRepository {
  // ── List all categories with live bed stats ──
  static async findAll() {
    const categories = await prisma.bedCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { beds: { orderBy: { bedNo: "asc" } } },
    });

    // Auto-seed if no categories exist yet
    if (categories.length === 0) {
      await BedCategoryRepository.seedDefaults();
      return BedCategoryRepository.findAll();
    }

    return categories.map((cat) => ({
      ...cat,
      bedsVacant:    cat.beds.filter((b) => b.status === "Vacant").length,
      bedsOccupied:  cat.beds.filter((b) => b.status === "Occupied").length,
      bedsOther:     cat.beds.filter((b) => !["Vacant", "Occupied"].includes(b.status)).length,
      beds:          cat.beds,
    }));
  }

  // ── Find single category by id ──
  static async findById(id) {
    return prisma.bedCategory.findUnique({
      where: { id },
      include: { beds: { orderBy: { bedNo: "asc" } } },
    });
  }

  // ── Find by name (case-insensitive) ──
  static async findByName(name) {
    return prisma.bedCategory.findFirst({
      where: { name: { equals: name.trim().toUpperCase(), mode: "insensitive" } },
    });
  }

  // ── Find by prefix ──
  static async findByPrefix(prefix) {
    return prisma.bedCategory.findFirst({
      where: { prefix: { equals: prefix.trim().toUpperCase(), mode: "insensitive" } },
    });
  }

  // ── Create category + generate beds ──
  static async create({ name, prefix, ward, tariffRate, totalBeds, sortOrder }) {
    const upperName   = name.trim().toUpperCase();
    const upperPrefix = prefix.trim().toUpperCase();

    const category = await prisma.bedCategory.create({
      data: { name: upperName, prefix: upperPrefix, ward: ward.trim(), tariffRate: Number(tariffRate), totalBeds: Number(totalBeds), sortOrder: Number(sortOrder || 0) },
    });

    // Generate bed records
    await BedCategoryRepository.generateBeds(category.id, upperPrefix, 1, Number(totalBeds));

    return BedCategoryRepository.findById(category.id);
  }

  // ── Update category (name/ward/tariff/bed count) ──
  static async update(id, { name, ward, tariffRate, totalBeds }) {
    const category = await prisma.bedCategory.findUnique({ where: { id }, include: { beds: true } });
    if (!category) return null;

    const currentCount = category.beds.length;
    const newCount     = Number(totalBeds);

    const updated = await prisma.bedCategory.update({
      where: { id },
      data: {
        ...(name      && { name: name.trim().toUpperCase() }),
        ...(ward      && { ward: ward.trim() }),
        ...(tariffRate !== undefined && { tariffRate: Number(tariffRate) }),
        ...(totalBeds !== undefined  && { totalBeds: newCount }),
      },
    });

    // Add or remove beds to match new count
    if (newCount > currentCount) {
      await BedCategoryRepository.generateBeds(id, category.prefix, currentCount + 1, newCount - currentCount);
    } else if (newCount < currentCount) {
      const toRemove = newCount;
      // Remove vacant beds from the end first
      const vacantBeds = category.beds
        .filter((b) => b.status === "Vacant")
        .sort((a, b) => b.bedNo.localeCompare(a.bedNo))
        .slice(0, currentCount - newCount);
      if (vacantBeds.length > 0) {
        await prisma.bed.deleteMany({ where: { id: { in: vacantBeds.map((b) => b.id) } } });
        // Recalculate totalBeds = actual remaining
        const remaining = await prisma.bed.count({ where: { categoryId: id } });
        await prisma.bedCategory.update({ where: { id }, data: { totalBeds: remaining } });
      }
    }

    return BedCategoryRepository.findById(id);
  }

  // ── Delete category (only if no occupied beds) ──
  static async delete(id) {
    const category = await prisma.bedCategory.findUnique({ where: { id }, include: { beds: true } });
    if (!category) return null;
    const occupied = category.beds.filter((b) => b.status === "Occupied");
    if (occupied.length > 0) {
      throw new Error(`Cannot delete "${category.name}" — ${occupied.length} bed(s) are currently occupied.`);
    }
    return prisma.bedCategory.delete({ where: { id } });
  }

  // ── Generate beds for a category (from startNum, count beds) ──
  static async generateBeds(categoryId, prefix, startNum, count) {
    const bedsData = [];
    for (let i = 0; i < count; i++) {
      const num   = String(startNum + i).padStart(2, "0");
      const bedNo = `${prefix}-${num}`;
      bedsData.push({ bedNo, categoryId, status: "Vacant" });
    }
    await prisma.bed.createMany({ data: bedsData, skipDuplicates: true });
  }

  // ── Get all beds (for ATD service) with optional category/status filter ──
  static async findBeds({ category, status, search } = {}) {
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
        { bedNo: { contains: q, mode: "insensitive" } },
        { category: { name: { contains: q, mode: "insensitive" } } },
        { patientJson: { contains: q, mode: "insensitive" } },
      ];
    }

    const beds = await prisma.bed.findMany({
      where,
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { bedNo: "asc" }],
    });

    return beds.map((b) => ({
      id:         b.id,
      bedNo:      b.bedNo,
      category:   b.category.name,
      categoryId: b.categoryId,
      ward:       b.category.ward,
      tariffRate: b.category.tariffRate,
      status:     b.status,
      patient:    b.patientJson ? JSON.parse(b.patientJson) : null,
      notes:      b.notes,
      cleaningStartedAt: b.cleaningStartedAt,
    }));
  }

  // ── Update a single bed's status/patient ──
  static async updateBed(id, data) {
    return prisma.bed.update({ where: { id }, data });
  }

  // ── Find a single bed by bedNo or id ──
  static async findBed(bedNoOrId) {
    const byBedNo = await prisma.bed.findUnique({
      where: { bedNo: bedNoOrId },
      include: { category: true },
    });
    if (byBedNo) return byBedNo;
    return prisma.bed.findUnique({ where: { id: bedNoOrId }, include: { category: true } });
  }

  // ── Seed default categories and beds ──
  static async seedDefaults() {
    for (const [idx, cat] of DEFAULT_BED_CATEGORIES.entries()) {
      const existing = await prisma.bedCategory.findUnique({ where: { name: cat.name } });
      if (!existing) {
        const created = await prisma.bedCategory.create({
          data: { ...cat, sortOrder: idx },
        });
        await BedCategoryRepository.generateBeds(created.id, cat.prefix, 1, cat.totalBeds);
      }
    }
  }

  // ── Count beds per status (hospital-wide) ──
  static async countsByStatus() {
    const allBeds = await prisma.bed.findMany({ select: { status: true } });
    const counts = {
      vacant:     0, occupied:    0, houseKeeping: 0,
      retain:     0, blocked:     0, underRepair:  0,
      stillOnBed: 0, total:       0,
    };
    for (const b of allBeds) {
      counts.total++;
      if (b.status === "Vacant")                           counts.vacant++;
      else if (b.status === "Occupied")                    counts.occupied++;
      else if (b.status === "House Keeping")               counts.houseKeeping++;
      else if (b.status === "Retain")                      counts.retain++;
      else if (b.status === "Blocked")                     counts.blocked++;
      else if (b.status === "Under Repair")                counts.underRepair++;
      else if (b.status === "Still On Bed/Discharge Approval") counts.stillOnBed++;
    }
    return counts;
  }
}

export default BedCategoryRepository;
