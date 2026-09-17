import { prisma } from "../../config/database.js";

export class AccessoriesRepository {
  /**
   * Create a new accessory
   */
  static async create(data) {
    return prisma.accessory.create({
      data: {
        code: data.code,
        name: data.name,
        price: data.price,
        sizesJson: JSON.stringify(data.sizes || []),
        minStockWarning: data.minStockWarning || 5,
        description: data.description || null,
      },
    });
  }

  /**
   * Find all accessories with optional filters
   */
  static async findMany(filters = {}) {
    const where = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.code) {
      where.code = { contains: filters.code, mode: "insensitive" };
    }

    if (filters.name) {
      where.name = { contains: filters.name, mode: "insensitive" };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const [accessories, total] = await Promise.all([
      prisma.accessory.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.accessory.count({ where }),
    ]);

    return {
      accessories: accessories.map((acc) => ({
        ...acc,
        sizes: JSON.parse(acc.sizesJson || "[]"),
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Find accessory by ID
   */
  static async findById(id) {
    const accessory = await prisma.accessory.findUnique({
      where: { id },
    });

    if (!accessory) return null;

    return {
      ...accessory,
      sizes: JSON.parse(accessory.sizesJson || "[]"),
    };
  }

  /**
   * Find accessory by code
   */
  static async findByCode(code) {
    const accessory = await prisma.accessory.findUnique({
      where: { code },
    });

    if (!accessory) return null;

    return {
      ...accessory,
      sizes: JSON.parse(accessory.sizesJson || "[]"),
    };
  }

  /**
   * Update accessory by ID
   */
  static async update(id, data) {
    const updateData = {};

    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.sizes !== undefined) updateData.sizesJson = JSON.stringify(data.sizes);
    if (data.minStockWarning !== undefined) updateData.minStockWarning = data.minStockWarning;
    if (data.description !== undefined) updateData.description = data.description;

    const updated = await prisma.accessory.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updated,
      sizes: JSON.parse(updated.sizesJson || "[]"),
    };
  }

  /**
   * Delete accessory by ID
   */
  static async delete(id) {
    return prisma.accessory.delete({
      where: { id },
    });
  }

  /**
   * Bulk create accessories
   */
  static async createMany(accessories) {
    const operations = accessories.map((acc) =>
      prisma.accessory.create({
        data: {
          code: acc.code,
          name: acc.name,
          price: acc.price,
          sizesJson: JSON.stringify(acc.sizes || []),
          minStockWarning: acc.minStockWarning || 5,
          description: acc.description || null,
        },
      })
    );

    return Promise.all(operations);
  }
}
