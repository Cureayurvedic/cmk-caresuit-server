import { z } from "zod";

const sizeStockSchema = z.object({
  size: z.string().min(1, "Size is required"),
  stockQuantity: z.number().int().min(0, "Stock quantity must be non-negative"),
});

export const createAccessorySchema = z.object({
  code: z.string().min(1, "Code is required").trim(),
  name: z.string().min(1, "Name is required").trim(),
  price: z.number().min(0, "Price must be non-negative"),
  sizes: z.array(sizeStockSchema).min(1, "At least one size is required"),
  minStockWarning: z.number().int().min(1, "Min stock warning must be at least 1").default(5),
  description: z.string().optional().or(z.literal("")).or(z.null()),
});

export const updateAccessorySchema = z.object({
  code: z.string().min(1).trim().optional(),
  name: z.string().min(1).trim().optional(),
  price: z.number().min(0).optional(),
  sizes: z.array(sizeStockSchema).optional(),
  minStockWarning: z.number().int().min(1).optional(),
  description: z.string().optional().or(z.literal("")).or(z.null()),
});

export const queryAccessorySchema = z.object({
  search: z.string().trim().optional(),
  code: z.string().trim().optional(),
  name: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const adjustStockSchema = z.object({
  size: z.string().min(1, "Size is required").trim(),
  delta: z.number().int(),
});

