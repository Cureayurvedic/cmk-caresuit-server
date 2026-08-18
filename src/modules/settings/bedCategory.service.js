import { BedCategoryRepository } from "./bedCategory.repository.js";
import { ValidationError, NotFoundError, ConflictError } from "../../utils/errors.js";

export class BedCategoryService {
  // ── List all categories ──
  static async listCategories() {
    const categories = await BedCategoryRepository.findAll();
    return { categories, total: categories.length };
  }

  // ── Create new category with validation ──
  static async createCategory({ name, prefix, ward, tariffRate, totalBeds, sortOrder }) {
    if (!name?.trim())   throw new ValidationError("Category name is required.");
    if (!prefix?.trim()) throw new ValidationError("Bed prefix is required (e.g. DLX, GEN, ICU).");
    if (!ward?.trim())   throw new ValidationError("Ward / floor description is required.");
    if (!totalBeds || isNaN(Number(totalBeds)) || Number(totalBeds) < 1) {
      throw new ValidationError("Number of beds must be at least 1.");
    }

    const dupName = await BedCategoryRepository.findByName(name);
    if (dupName) throw new ConflictError(`Category "${name.trim().toUpperCase()}" already exists.`);

    const dupPrefix = await BedCategoryRepository.findByPrefix(prefix);
    if (dupPrefix) throw new ConflictError(`Prefix "${prefix.trim().toUpperCase()}" is already used by "${dupPrefix.name}".`);

    const nextOrder = await BedCategoryService.getNextSortOrder();
    return BedCategoryRepository.create({ name, prefix, ward, tariffRate: tariffRate || 2000, totalBeds, sortOrder: sortOrder ?? nextOrder });
  }

  // ── Update category ──
  static async updateCategory(id, { name, ward, tariffRate, totalBeds }) {
    const existing = await BedCategoryRepository.findById(id);
    if (!existing) throw new NotFoundError(`Bed category with id "${id}" not found.`);

    if (totalBeds !== undefined) {
      const newCount = Number(totalBeds);
      if (isNaN(newCount) || newCount < 1) throw new ValidationError("Number of beds must be at least 1.");
      // Make sure we won't drop below occupied count
      const occupied = existing.beds.filter((b) => b.status === "Occupied").length;
      if (newCount < occupied) {
        throw new ValidationError(`Cannot reduce to ${newCount} beds — ${occupied} bed(s) are currently occupied.`);
      }
    }

    return BedCategoryRepository.update(id, { name, ward, tariffRate, totalBeds });
  }

  // ── Delete category ──
  static async deleteCategory(id) {
    const existing = await BedCategoryRepository.findById(id);
    if (!existing) throw new NotFoundError(`Bed category with id "${id}" not found.`);

    try {
      return await BedCategoryRepository.delete(id);
    } catch (err) {
      throw new ValidationError(err.message);
    }
  }

  // ── Helper: get next sort order ──
  static async getNextSortOrder() {
    const cats = await BedCategoryRepository.findAll();
    return cats.length;
  }
}

export default BedCategoryService;
