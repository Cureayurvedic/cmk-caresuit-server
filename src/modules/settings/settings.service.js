import { SettingsRepository, VALID_CATEGORIES } from "./settings.repository.js";
import { ValidationError, NotFoundError, ConflictError } from "../../utils/errors.js";
import { prisma } from "../../config/database.js";

export class SettingsService {
  /**
   * Validate that the requested category is allowed.
   */
  static validateCategory(category) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new ValidationError(
        `Invalid category "${category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`
      );
    }
  }

  /**
   * List all items for a category. Auto-seeds defaults on first access.
   */
  static async listItems(category) {
    SettingsService.validateCategory(category);
    const items = await SettingsRepository.findByCategory(category);
    const total = items.length;
    return { items, total, category };
  }

  /**
   * Add a new item to a category.
   */
  static async addItem(category, value) {
    SettingsService.validateCategory(category);

    if (!value || !value.trim()) {
      throw new ValidationError("Item value cannot be empty.");
    }

    const duplicate = await SettingsRepository.existsInCategory(category, value);
    if (duplicate) {
      throw new ConflictError(
        `"${value.trim()}" already exists in ${category}. Duplicate entries are not allowed.`
      );
    }

    const item = await SettingsRepository.create(category, value);
    return item;
  }

  /**
   * Delete an item by its id. Block deletion if associated patients exist.
   */
  static async deleteItem(id) {
    const existing = await SettingsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Option with id "${id}" not found.`);
    }

    const val = existing.value;
    const cat = existing.category;

    // Check if patients are linked to this branch or setting
    if (cat === "branches") {
      const patientCount = await prisma.patient.count({
        where: {
          OR: [
            { hcf: { equals: val, mode: "insensitive" } },
            { hcf: { equals: val } }
          ]
        }
      });
      if (patientCount > 0) {
        throw new ConflictError(
          `Cannot delete branch "${val}" because ${patientCount} patient(s) are registered under this branch. Please reassign patients before deleting.`
        );
      }
    } else if (cat === "doctors" || cat === "providers") {
      const patientCount = await prisma.patient.count({
        where: {
          provider: { equals: val, mode: "insensitive" }
        }
      });
      if (patientCount > 0) {
        throw new ConflictError(
          `Cannot delete "${val}" because ${patientCount} patient(s) are associated with it.`
        );
      }
    } else if (cat === "companies" || cat === "insurances" || cat === "payers") {
      const patientCount = await prisma.patient.count({
        where: {
          OR: [
            { payer: { equals: val, mode: "insensitive" } },
            { sponsor: { equals: val, mode: "insensitive" } }
          ]
        }
      });
      if (patientCount > 0) {
        throw new ConflictError(
          `Cannot delete "${val}" because ${patientCount} patient(s) are associated with it.`
        );
      }
    }

    await SettingsRepository.delete(id);
    return { deleted: true, id };
  }
}

export default SettingsService;
