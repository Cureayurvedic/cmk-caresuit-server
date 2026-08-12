import { prisma } from "../../config/database.js";

export class AuthRepository {
  static async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  static async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  static async createUser(userData) {
    return await prisma.user.create({
      data: userData,
    });
  }
}

export default AuthRepository;
