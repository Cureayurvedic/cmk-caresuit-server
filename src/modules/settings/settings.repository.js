import { prisma } from "../../config/database.js";

// Default values for each category — seeded automatically when a category is empty
export const DEFAULT_VALUES = {
  providers: ["Self", "Referral", "Camp", "OPD", "Emergency"],
  leadSources: ["Walk-in", "Online", "Phone", "Camp", "Doctor Referral", "Insurance"],
  religions: ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other"],
  occupations: [
    "Astrologer", "Banker", "Business", "Carpenter", "Doctor", "Driver",
    "Engineer", "Farmer", "Fisherman", "Hairdresser", "Housewife", "Labor",
    "Lawyer", "Mechanic", "Nil", "Retired", "Service", "Student"
  ],
  branches: ["CMK Main", "CMK Branch 1", "CMK Branch 2"],
  companies: ["TATA Consultancy Services", "Reliance Industries", "Infosys Ltd", "Wipro", "HDFC Bank"],
  insurances: [
    "Star Health Insurance", "Niva Bupa Health Insurance", "Care Health Insurance",
    "HDFC ERGO", "ICICI Lombard", "Aditya Birla Health", "LIC of India"
  ],
};

export const VALID_CATEGORIES = Object.keys(DEFAULT_VALUES);

export class SettingsRepository {
  /**
   * Find all items for a given category.
   * If the category has no records, automatically seed defaults.
   */
  static async findByCategory(category) {
    const items = await prisma.masterOption.findMany({
      where: { category },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    // Auto-seed defaults if this category has never been populated
    if (items.length === 0 && DEFAULT_VALUES[category]) {
      const defaults = DEFAULT_VALUES[category];
      await prisma.masterOption.createMany({
        data: defaults.map((value, idx) => ({ category, value, sortOrder: idx })),
        skipDuplicates: true,
      });
      return prisma.masterOption.findMany({
        where: { category },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }

    return items;
  }

  /**
   * Find a single option by id.
   */
  static async findById(id) {
    return prisma.masterOption.findUnique({ where: { id } });
  }

  /**
   * Check if a value already exists within a category (case-insensitive).
   */
  static async existsInCategory(category, value) {
    const existing = await prisma.masterOption.findFirst({
      where: {
        category,
        value: { equals: value.trim(), mode: "insensitive" },
      },
    });
    return !!existing;
  }

  /**
   * Create a new item in a category.
   */
  static async create(category, value) {
    // Get current max sortOrder
    const last = await prisma.masterOption.findFirst({
      where: { category },
      orderBy: { sortOrder: "desc" },
    });
    const sortOrder = last ? last.sortOrder + 1 : 0;

    return prisma.masterOption.create({
      data: { category, value: value.trim(), sortOrder },
    });
  }

  /**
   * Delete an item by id.
   */
  static async delete(id) {
    return prisma.masterOption.delete({ where: { id } });
  }

  /**
   * Get total count for a category.
   */
  static async countByCategory(category) {
    return prisma.masterOption.count({ where: { category } });
  }
}

export default SettingsRepository;
