import { jest } from "@jest/globals";

// Mock the authentication middleware using ESM unstable_mockModule
jest.unstable_mockModule("../../src/middlewares/auth.middleware.js", () => ({
  protect: (req, res, next) => {
    req.user = { id: "admin-id", role: "Admin", status: "Active" };
    next();
  },
  authorize: () => (req, res, next) => next(),
}));

// Mock the patient repository using ESM unstable_mockModule
jest.unstable_mockModule("../../src/modules/patients/patient.repository.js", () => ({
  PatientRepository: {
    findAndCountAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  default: {
    findAndCountAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  }
}));

// Dynamically import dependencies after registering mocks
const request = (await import("supertest")).default;
const { app } = await import("../../src/app.js");
const { PatientRepository } = await import("../../src/modules/patients/patient.repository.js");

describe("Patients API Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/patients", () => {
    test("should reject request with 400 if validation fails", async () => {
      const invalidPatient = {
        registrationType: "New Registration",
        // Missing required fields: title, firstName, gender, mobile, address, state, payerType, guardianName
      };

      const res = await request(app)
        .post("/api/v1/patients")
        .send(invalidPatient);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    test("should create patient successfully with status 201", async () => {
      const validPatient = {
        registrationType: "New Registration",
        title: "Mr.",
        firstName: "John",
        gender: "Male",
        guardianName: "Robert",
        mobile: "9876543210",
        address: "123 Main St",
        state: "Delhi",
        payerType: "direct",
      };

      PatientRepository.findAndCountAll.mockResolvedValue({ patients: [], total: 0 });
      PatientRepository.count.mockResolvedValue(0);
      PatientRepository.create.mockResolvedValue({
        id: "patient-id-123",
        uhid: "UHID-2026-00001-1234",
        ...validPatient,
      });

      const res = await request(app)
        .post("/api/v1/patients")
        .send(validPatient);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patient.uhid).toBeDefined();
    });
  });

  describe("GET /api/v1/patients/:id", () => {
    test("should return 404 if patient is not found", async () => {
      PatientRepository.findById.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/v1/patients/patient-id-nonexistent");

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND_ERROR");
    });
  });
});
