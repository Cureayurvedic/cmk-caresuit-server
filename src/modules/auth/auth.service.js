import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../../config/index.js";
import { AuthRepository } from "./auth.repository.js";
import { ConflictError, AuthenticationError, AuthorizationError } from "../../utils/errors.js";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

export class AuthService {
  static async registerUser(userData) {
    const existingUser = await AuthRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError("Email is already registered. Please login.");
    }

    // Explicitly hash password before storing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const newUser = await AuthRepository.createUser({
      ...userData,
      password: hashedPassword,
    });

    const userResponse = { ...newUser };
    delete userResponse.password;

    const token = generateToken(newUser.id);

    return { user: userResponse, token };
  }

  static async loginUser(email, password) {
    const user = await AuthRepository.findByEmail(email);
    if (!user) {
      throw new AuthenticationError("Invalid email or password.");
    }

    // Verify password directly against the hashed string
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AuthenticationError("Invalid email or password.");
    }

    if (user.status === "Inactive") {
      throw new AuthorizationError("Your account has been deactivated. Please contact support.");
    }

    const token = generateToken(user.id);

    const userResponse = { ...user };
    delete userResponse.password;

    return { user: userResponse, token };
  }
}

export default AuthService;
