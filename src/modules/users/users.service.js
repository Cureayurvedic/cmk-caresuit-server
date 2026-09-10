import bcrypt from "bcryptjs";
import { prisma } from "../../config/database.js";
import { ConflictError, NotFoundError } from "../../utils/errors.js";

export class UsersService {
  static async getAllUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }

  static async createUser(userData) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });
    
    if (existingUser) {
      throw new ConflictError("Email is already in use by another user");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const newUser = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      }
    });

    return newUser;
  }

  static async updateUser(id, updateData) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: updateData.email },
      });
      if (existingUser) {
        throw new ConflictError("Email is already in use by another user");
      }
    }

    const payload = { ...updateData };

    if (payload.password) {
      const salt = await bcrypt.genSalt(10);
      payload.password = await bcrypt.hash(payload.password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: payload,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return updatedUser;
  }

  static async deleteUser(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    await prisma.user.delete({ where: { id } });
  }
}
