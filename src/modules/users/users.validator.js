import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["Admin", "Doctor", "Nurse", "Receptionist"]).default("Receptionist"),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").trim().optional(),
  email: z.string().email("Invalid email address").trim().toLowerCase().optional(),
  password: z.string().min(1, "Password must not be empty").optional(),
  role: z.enum(["Admin", "Doctor", "Nurse", "Receptionist"]).optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
});
