import { AccessoriesRepository } from "./accessories.repository.js";
import { AppError } from "../../utils/errors.js";

export class AccessoriesService {
  /**
   * Create a new accessory
   */
  static async createAccessory(data) {
    // Check if code already exists
    const existing = await AccessoriesRepository.findByCode(data.code);
    if (existing) {
      throw new AppError(`Accessory with code "${data.code}" already exists`, 400);
    }

    return AccessoriesRepository.create(data);
  }

  /**
   * Get all accessories with filters
   */
  static async getAllAccessories(filters) {
    return AccessoriesRepository.findMany(filters);
  }

  /**
   * Get accessory by ID
   */
  static async getAccessoryById(id) {
    const accessory = await AccessoriesRepository.findById(id);
    if (!accessory) {
      throw new AppError("Accessory not found", 404);
    }
    return accessory;
  }

  /**
   * Update accessory
   */
  static async updateAccessory(id, data) {
    const existing = await AccessoriesRepository.findById(id);
    if (!existing) {
      throw new AppError("Accessory not found", 404);
    }

    // If updating code, check uniqueness
    if (data.code && data.code !== existing.code) {
      const codeExists = await AccessoriesRepository.findByCode(data.code);
      if (codeExists) {
        throw new AppError(`Accessory with code "${data.code}" already exists`, 400);
      }
    }

    return AccessoriesRepository.update(id, data);
  }

  /**
   * Delete accessory
   */
  static async deleteAccessory(id) {
    const existing = await AccessoriesRepository.findById(id);
    if (!existing) {
      throw new AppError("Accessory not found", 404);
    }

    await AccessoriesRepository.delete(id);
    return { message: "Accessory deleted successfully" };
  }

  /**
   * Adjust stock for a specific size
   */
  static async adjustStock(id, size, delta) {
    const accessory = await AccessoriesRepository.findById(id);
    if (!accessory) {
      throw new AppError("Accessory not found", 404);
    }

    const sizes = accessory.sizes || [];
    const sizeIndex = sizes.findIndex((s) => s.size === size);

    if (sizeIndex !== -1) {
      const newQty = sizes[sizeIndex].stockQuantity + delta;
      if (newQty < 0) {
        throw new AppError(`Cannot reduce stock below 0 for size ${size}`, 400);
      }
      sizes[sizeIndex].stockQuantity = newQty;
    } else {
      // Size doesn't exist, add it
      if (delta < 0) {
        throw new AppError(`Size ${size} does not exist, cannot reduce stock`, 400);
      }
      sizes.push({ size, stockQuantity: delta });
    }

    return AccessoriesRepository.update(id, { sizes });
  }

  /**
   * Bulk import accessories
   */
  static async importAccessories(accessories) {
    const results = {
      totalRecords: accessories.length,
      insertedCount: 0,
      skippedCount: 0,
      errors: [],
    };

    for (const acc of accessories) {
      try {
        // Check if code exists
        const existing = await AccessoriesRepository.findByCode(acc.code);
        if (existing) {
          results.skippedCount++;
          results.errors.push(`Skipped: Code "${acc.code}" already exists`);
          continue;
        }

        await AccessoriesRepository.create({
          code: acc.code,
          name: acc.name,
          price: acc.price,
          sizes: acc.sizes || [],
          minStockWarning: acc.minStockWarning || 5,
          description: acc.description || null,
        });

        results.insertedCount++;
      } catch (error) {
        results.skippedCount++;
        results.errors.push(`Error importing "${acc.code}": ${error.message}`);
      }
    }

    return results;
  }
}
