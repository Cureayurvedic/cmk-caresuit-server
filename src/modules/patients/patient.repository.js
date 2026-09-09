import { prisma } from "../../config/database.js";

export class PatientRepository {
  static async findAndCountAll({ search, page = 1, limit = 20, uhid, patientName, dob, mobile, phone, email, company, identityNo, address, hcf, branch }) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const filter = {};
    const AND = [];

    const targetBranch = hcf || branch;
    if (targetBranch && targetBranch.toLowerCase() !== "all") {
      if (targetBranch.toLowerCase() === "cmk main") {
        AND.push({
          OR: [
            { hcf: { equals: "CMK Main", mode: "insensitive" } },
            { hcf: { equals: null } },
            { hcf: { equals: "" } },
          ]
        });
      } else {
        AND.push({ hcf: { equals: targetBranch, mode: "insensitive" } });
      }
    }

    if (search) {
      AND.push({
        OR: [
          { fullName: { contains: search, mode: "insensitive" } },
          { uhid: { contains: search, mode: "insensitive" } },
          { mobile: { contains: search, mode: "insensitive" } },
          { aadhaarCard: { contains: search, mode: "insensitive" } },
        ]
      });
    }

    if (uhid) AND.push({ uhid: { contains: uhid, mode: "insensitive" } });
    if (patientName) AND.push({ fullName: { contains: patientName, mode: "insensitive" } });
    if (mobile || phone) AND.push({ mobile: { contains: mobile || phone, mode: "insensitive" } });
    if (email) AND.push({ email: { contains: email, mode: "insensitive" } });
    if (company) AND.push({ payer: { contains: company, mode: "insensitive" } });
    if (address) AND.push({ address: { contains: address, mode: "insensitive" } });
    if (identityNo) {
      AND.push({
        OR: [
          { aadhaarCard: { contains: identityNo, mode: "insensitive" } },
          { panNo: { contains: identityNo, mode: "insensitive" } }
        ]
      });
    }

    if (AND.length > 0) {
      filter.AND = AND;
    }

    const skip = (pageNum - 1) * limitNum;

    // Run parallel transactions for patient records list and total count
    const [patients, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where: filter,
        orderBy: [{ regDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: limitNum,
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
