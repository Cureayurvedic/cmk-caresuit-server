import { z } from "zod";

const sanitizeDigits = (val) => (typeof val === "string" ? val.replace(/[\s-]/g, "") : val);
const sanitizePan = (val) => (typeof val === "string" ? val.trim().toUpperCase() : val);

export const createPatientSchema = z.object({
  registrationType: z.string().min(1, "Registration type is required"),
  uhid: z.string().optional().or(z.literal("")),
  title: z.string().min(1, "Title is required"),
  firstName: z.string().min(1, "First name is required").regex(/^[A-Za-z\s]+$/, "Only alphabets are allowed in first name"),
  middleName: z.string().regex(/^[A-Za-z\s]*$/, "Only alphabets are allowed in middle name").optional().or(z.literal("")),
  lastName: z.string().regex(/^[A-Za-z\s]*$/, "Only alphabets are allowed in last name").optional().or(z.literal("")),
  gender: z.string().min(1, "Gender is required"),
  maritalStatus: z.string().optional().or(z.literal("")),
  dob: z.string().optional().or(z.null()).or(z.literal("")),
  age: z.coerce.number().optional().or(z.null()),
  guardianName: z.string().min(1, "Guardian name is required").regex(/^[A-Za-z\s]+$/, "Only alphabets are allowed in guardian name"),
  guardianRelation: z.string().optional().or(z.literal("")),
  regDate: z.string().optional().or(z.literal("")),
  
  // Contact
  mobile: z.preprocess(sanitizeDigits, z.string().regex(/^\d{10}$/, "Mobile number must be exactly 10 digits")),
  address: z.string().min(1, "Address is required"),
  country: z.string().default("India"),
  state: z.string().min(1, "State is required"),
  districtCity: z.string().optional().or(z.literal("")),
  area: z.string().optional().or(z.literal("")),
  pinCode: z.preprocess(sanitizeDigits, z.string().regex(/^\d{6}$/, "PIN code must be exactly 6 digits").optional().or(z.literal(""))),
  altPhone: z.preprocess(sanitizeDigits, z.string().regex(/^\d{10}$/, "Alternative phone must be exactly 10 digits").optional().or(z.literal(""))),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  photoUrl: z.string().optional().or(z.literal("")),
  
  // Emergency
  emergencyName: z.string().regex(/^[A-Za-z\s]*$/, "Only alphabets are allowed in emergency name").optional().or(z.literal("")),
  emergencyRelationship: z.string().optional().or(z.literal("")),
  emergencyContact: z.preprocess(sanitizeDigits, z.string().regex(/^\d{10}$/, "Emergency contact must be exactly 10 digits").optional().or(z.literal(""))),
  
  // Identity
  nationality: z.string().default("Indian"),
  aadhaarCard: z.preprocess(sanitizeDigits, z.string().regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits").optional().or(z.literal(""))),
  panNo: z.preprocess(sanitizePan, z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format").optional().or(z.literal(""))),
  
  // Payer
  payerType: z.string().min(1, "Payer type is required"),
  payer: z.string().optional().or(z.literal("")),
  sponsor: z.string().optional().or(z.literal("")),
  
  // Referral
  provider: z.string().optional().or(z.literal("")),
  leadSource: z.string().optional().or(z.literal("")),
  referredType: z.string().optional().or(z.literal("")),
  referredBy: z.string().optional().or(z.literal("")),
  hcf: z.string().optional().or(z.literal("")),
  status: z.string().default("Active"),
  remarks: z.string().optional().or(z.literal("")),
  
  // Other Details
  religion: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  isVip: z.boolean().default(false),
  isAnimation: z.boolean().default(false),
  nameMasking: z.boolean().default(false),
  handleWithCare: z.boolean().default(false),
  sendPromoSms: z.boolean().default(false),
  sendPromoEmail: z.boolean().default(false),
});

export const updatePatientSchema = createPatientSchema.partial();
export const queryPatientSchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});
