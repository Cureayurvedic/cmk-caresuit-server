import { prisma } from "../../config/database.js";

export class PatientRepository {
  static async findAndCountAll({ search, page = 1, limit = 20 }) {
    const filter = {};

    if (search) {
      filter.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { uhid: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search, mode: "insensitive" } },
        { aadhaarCard: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    // Run parallel transactions for patient records list and total count
    const [patients, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where: filter,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where: filter }),
    ]);

    return { patients, total };
  }

  static async findById(id) {
    return await prisma.patient.findUnique({
      where: { id },
    });
  }

  static async findByUhid(uhid) {
    return await prisma.patient.findUnique({
      where: { uhid },
    });
  }

  static async count() {
    return await prisma.patient.count();
  }

  static async create(data) {
    return await prisma.patient.create({
      data,
    });
  }

  static async update(id, data) {
    return await prisma.patient.update({
      where: { id },
      data,
    });
  }

  static async delete(id) {
    return await prisma.patient.delete({
      where: { id },
    });
  }
}

export default PatientRepository;
