import { jest } from "@jest/globals";

// Mock the AuthRepository module using ESM unstable_mockModule
jest.unstable_mockModule("../../src/modules/auth/auth.repository.js", () => ({
  AuthRepository: {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    findById: jest.fn(),
  },
  default: {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    findById: jest.fn(),
  }
}));

// Mock the bcryptjs module using ESM unstable_mockModule
jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
    genSalt: jest.fn(),
  },
  compare: jest.fn(),
  hash: jest.fn(),
  genSalt: jest.fn(),
}));

// Dynamically import dependencies after registering mock modules
const { AuthService } = await import("../../src/modules/auth/auth.service.js");
const { AuthRepository } = await import("../../src/modules/auth/auth.repository.js");
const { ConflictError, AuthenticationError, AuthorizationError } = await import("../../src/utils/errors.js");
const bcrypt = await import("bcryptjs");

describe("AuthService Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set default mock behavior for bcrypt methods on the default export (used by default import)
    bcrypt.default.compare.mockResolvedValue(true);
    bcrypt.default.hash.mockResolvedValue("hashed-password-123");
    bcrypt.default.genSalt.mockResolvedValue("salt-123");
  });

  describe("registerUser", () => {
    test("should throw ConflictError if user email already exists", async () => {
      AuthRepository.findByEmail.mockResolvedValue({ id: "existing-id" });

      const userData = { name: "Test User", email: "test@example.com", password: "password123" };

      await expect(AuthService.registerUser(userData)).rejects.toThrow(ConflictError);
      expect(AuthRepository.findByEmail).toHaveBeenCalledWith("test@example.com");
    });

    test("should successfully create user and generate token", async () => {
      AuthRepository.findByEmail.mockResolvedValue(null);
      const mockCreatedUser = {
        id: "user-id-123",
        name: "Test User",
        email: "test@example.com",
      };
      AuthRepository.createUser.mockResolvedValue(mockCreatedUser);

      const userData = { name: "Test User", email: "test@example.com", password: "password123" };

      const result = await AuthService.registerUser(userData);

      expect(result.token).toBeDefined();
      expect(result.user.name).toBe("Test User");
      expect(AuthRepository.createUser).toHaveBeenCalled();
    });
  });

  describe("loginUser", () => {
    test("should throw AuthenticationError if email does not exist", async () => {
      AuthRepository.findByEmail.mockResolvedValue(null);

      await expect(AuthService.loginUser("nonexistent@example.com", "password")).rejects.toThrow(
        AuthenticationError
      );
    });

    test("should throw AuthenticationError if password does not match", async () => {
      const mockUser = {
        email: "test@example.com",
        password: "hashed-password-123",
      };
      AuthRepository.findByEmail.mockResolvedValue(mockUser);
      bcrypt.default.compare.mockResolvedValue(false);

      await expect(AuthService.loginUser("test@example.com", "wrong-password")).rejects.toThrow(
        AuthenticationError
      );
    });

    test("should throw AuthorizationError if user status is Inactive", async () => {
      const mockUser = {
        email: "test@example.com",
        status: "Inactive",
        password: "hashed-password-123",
      };
      AuthRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(AuthService.loginUser("test@example.com", "password")).rejects.toThrow(
        AuthorizationError
      );
    });
  });
});
