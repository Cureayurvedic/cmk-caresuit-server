-- =============================================================================
-- CMK CareSuite Hospital CRM - Complete PostgreSQL Database DDL Script
-- =============================================================================
-- Database Name: cmk_crm
-- Schema Name: caresuite
-- Target Engine: PostgreSQL 12+
-- =============================================================================

-- 1. Create Database (If Not Exists)
-- Execute this statement independently if connected to PostgreSQL server:
SELECT 'CREATE DATABASE cmk_crm'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cmk_crm');

-- 2. Create Schema & Set Search Path
CREATE SCHEMA IF NOT EXISTS caresuite;
SET search_path TO caresuite, public;

-- Enable UUID extension for UUID primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 3. CUSTOM ENUM TYPES
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'caresuite')) THEN
        CREATE TYPE caresuite."Role" AS ENUM ('Admin', 'Doctor', 'Nurse', 'Receptionist');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountStatus' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'caresuite')) THEN
        CREATE TYPE caresuite."AccountStatus" AS ENUM ('Active', 'Inactive');
    END IF;
END $$;

-- =============================================================================
-- 4. TABLES & CONSTRAINTS
-- =============================================================================

-- Table 1: System Users (Admins, Doctors, Nurses, Receptionists)
CREATE TABLE IF NOT EXISTS caresuite."users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "role" caresuite."Role" NOT NULL DEFAULT 'Receptionist',
    "status" caresuite."AccountStatus" NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Patient Registration & Demographics
CREATE TABLE IF NOT EXISTS caresuite."patients" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "registrationType" VARCHAR(100) NOT NULL,
    "uhid" VARCHAR(100) NOT NULL UNIQUE,
    "title" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100),
    "fullName" VARCHAR(255) NOT NULL,
    "gender" VARCHAR(50) NOT NULL,
    "maritalStatus" VARCHAR(50),
    "dob" TIMESTAMP(3),
    "age" INTEGER,
    "guardianName" VARCHAR(150) NOT NULL,
    "guardianRelation" VARCHAR(50),
    "regDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mobile" VARCHAR(20) NOT NULL,
    "address" TEXT NOT NULL,
    "country" VARCHAR(100) NOT NULL DEFAULT 'India',
    "state" VARCHAR(100) NOT NULL,
    "districtCity" VARCHAR(100),
    "area" VARCHAR(100),
    "pinCode" VARCHAR(20),
    "altPhone" VARCHAR(20),
    "email" VARCHAR(255),
    "photoUrl" TEXT,
    "emergencyName" VARCHAR(150),
    "emergencyRelationship" VARCHAR(50),
    "emergencyContact" VARCHAR(20),
    "nationality" VARCHAR(100) NOT NULL DEFAULT 'Indian',
    "aadhaarCard" VARCHAR(20),
    "panNo" VARCHAR(20),
    "payerType" VARCHAR(50) NOT NULL,
    "payer" VARCHAR(150),
    "sponsor" VARCHAR(150),
    "provider" VARCHAR(100),
    "leadSource" VARCHAR(100),
    "referredType" VARCHAR(100),
    "referredBy" VARCHAR(150),
    "hcf" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "remarks" TEXT,
    "religion" VARCHAR(50),
    "occupation" VARCHAR(100),
    "isVip" BOOLEAN NOT NULL DEFAULT FALSE,
    "isAnimation" BOOLEAN NOT NULL DEFAULT FALSE,
    "nameMasking" BOOLEAN NOT NULL DEFAULT FALSE,
    "handleWithCare" BOOLEAN NOT NULL DEFAULT FALSE,
    "sendPromoSms" BOOLEAN NOT NULL DEFAULT FALSE,
    "sendPromoEmail" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Invoices
CREATE TABLE IF NOT EXISTS caresuite."invoices" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "company" VARCHAR(255) NOT NULL DEFAULT 'CASH / CASH',
    "uhid" VARCHAR(100) NOT NULL,
    "patientName" VARCHAR(255) NOT NULL,
    "encNo" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL, -- "OP" | "IP"
    "invoiceNo" VARCHAR(100) UNIQUE NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doctorName" VARCHAR(255),
    "department" VARCHAR(100),
    "grossAmt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "discountAmt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "taxAmt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "netAmt" DOUBLE PRECISION NOT NULL,
    "paidPatient" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "paidPayer" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "adjusted" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "refund" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "creditNote" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "balance" DOUBLE PRECISION NOT NULL,
    "status" VARCHAR(50) NOT NULL, -- "Outstanding" | "Settled" | "Refundable" | "Cancelled"
    "tdsAmt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isCancelled" BOOLEAN NOT NULL DEFAULT FALSE,
    "itemsJson" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: Receipts
CREATE TABLE IF NOT EXISTS caresuite."receipts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "receiptNo" VARCHAR(100),
    "invoiceId" UUID REFERENCES caresuite."invoices"("id") ON DELETE CASCADE,
    "uhid" VARCHAR(100),
    "patientName" VARCHAR(255),
    "mode" VARCHAR(100) NOT NULL, -- "Cash" | "Card" | "UPI" | "Cheque" | "Bank Transfer" | "CreditNote" | "TDS"
    "amount" DOUBLE PRECISION NOT NULL,
    "bankName" VARCHAR(255),
    "beneficiaryName" VARCHAR(255),
    "refNo" VARCHAR(255),
    "cardSwipingValue" DOUBLE PRECISION DEFAULT 0.0,
    "type" VARCHAR(100) NOT NULL DEFAULT 'Settlement', -- "Settlement" | "Advance" | "Refund" | "CreditNote" | "TDS"
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 5: Outpatient Visits (OpVisit)
CREATE TABLE IF NOT EXISTS caresuite."op_visits" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "visitNo" VARCHAR(100) UNIQUE NOT NULL,
    "uhid" VARCHAR(100) NOT NULL,
    "patientName" VARCHAR(255) NOT NULL,
    "doctorName" VARCHAR(255) NOT NULL,
    "department" VARCHAR(100),
    "payerType" VARCHAR(100) NOT NULL DEFAULT 'Direct Patient',
    "payer" VARCHAR(150),
    "sponsor" VARCHAR(150),
    "network" VARCHAR(100),
    "consultationFee" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "visitType" VARCHAR(50) NOT NULL DEFAULT 'New', -- "New" | "Follow-up" | "Emergency"
    "status" VARCHAR(50) NOT NULL DEFAULT 'Open', -- "Open" | "Closed" | "Sent for Billing"
    "visitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 6: Billing Orders
CREATE TABLE IF NOT EXISTS caresuite."billing_orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "orderNo" VARCHAR(100) UNIQUE NOT NULL,
    "uhid" VARCHAR(100) NOT NULL,
    "visitNo" VARCHAR(100),
    "patientName" VARCHAR(255) NOT NULL,
    "doctorName" VARCHAR(255) NOT NULL,
    "orderType" VARCHAR(100) NOT NULL DEFAULT 'General', -- "Lab" | "Radiology" | "Procedure" | "Pharmacy" | "Consultation" | "General"
    "status" VARCHAR(50) NOT NULL DEFAULT 'Unbilled', -- "Unbilled" | "Billed" | "Cancelled"
    "itemsJson" TEXT NOT NULL, -- JSON array of order line items
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 7: Advance Collections
CREATE TABLE IF NOT EXISTS caresuite."advance_collections" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "advanceNo" VARCHAR(100) UNIQUE NOT NULL,
    "uhid" VARCHAR(100) NOT NULL,
    "patientName" VARCHAR(255) NOT NULL,
    "encNo" VARCHAR(100),
    "amount" DOUBLE PRECISION NOT NULL,
    "adjustedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "refundAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "balanceAmount" DOUBLE PRECISION NOT NULL,
    "mode" VARCHAR(100) NOT NULL DEFAULT 'Cash',
    "bankName" VARCHAR(255),
    "beneficiaryName" VARCHAR(255),
    "refNo" VARCHAR(255),
    "purpose" VARCHAR(255), -- "Admission Advance", "Surgery Deposit", "General Advance"
    "status" VARCHAR(50) NOT NULL DEFAULT 'Active', -- "Active" | "Fully Adjusted" | "Refunded"
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 8: Credit Notes
CREATE TABLE IF NOT EXISTS caresuite."credit_notes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "creditNoteNo" VARCHAR(100) UNIQUE NOT NULL,
    "invoiceId" VARCHAR(100),
    "invoiceNo" VARCHAR(100) NOT NULL,
    "uhid" VARCHAR(100) NOT NULL,
    "patientName" VARCHAR(255) NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "authorizedBy" VARCHAR(255) NOT NULL DEFAULT 'Dr. Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 9: Refund Records
CREATE TABLE IF NOT EXISTS caresuite."refund_records" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "refundNo" VARCHAR(100) UNIQUE NOT NULL,
    "uhid" VARCHAR(100) NOT NULL,
    "patientName" VARCHAR(255) NOT NULL,
    "invoiceId" VARCHAR(100),
    "invoiceNo" VARCHAR(100),
    "receiptId" VARCHAR(100),
    "amount" DOUBLE PRECISION NOT NULL,
    "mode" VARCHAR(100) NOT NULL DEFAULT 'Cash',
    "bankName" VARCHAR(255),
    "refNo" VARCHAR(255),
    "reason" TEXT NOT NULL,
    "authorizedBy" VARCHAR(255) NOT NULL DEFAULT 'Dr. Admin',
    "status" VARCHAR(50) NOT NULL DEFAULT 'Processed', -- "Processed" | "Pending" | "Cancelled"
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 10: Insurance Intimations
CREATE TABLE IF NOT EXISTS caresuite."insurance_intimations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "uhid" VARCHAR(100) NOT NULL,
    "patientName" VARCHAR(255) NOT NULL,
    "encNo" VARCHAR(100),
    "tpaName" VARCHAR(150) NOT NULL,
    "policyNo" VARCHAR(100) NOT NULL,
    "claimNo" VARCHAR(100) NOT NULL,
    "requestedAmt" DOUBLE PRECISION NOT NULL,
    "approvedAmt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "coPayAmt" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Initiated', -- "Initiated" | "Under Process" | "Query Raised" | "Approved" | "Rejected" | "Settled"
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 11: Settings Master Options
CREATE TABLE IF NOT EXISTS caresuite."master_options" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "category" VARCHAR(100) NOT NULL, -- "providers" | "leadSources" | "religions" | "occupations" | "branches" | "companies" | "insurances" | "doctors" | "payers"
    "value" VARCHAR(255) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "master_options_category_value_key" UNIQUE ("category", "value")
);

-- Table 12: Bed Categories
CREATE TABLE IF NOT EXISTS caresuite."bed_categories" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) UNIQUE NOT NULL, -- "DELUXE", "GENERAL", "ICU"
    "prefix" VARCHAR(50) UNIQUE NOT NULL, -- "DLX", "GEN", "ICU"
    "ward" VARCHAR(255) NOT NULL,
    "tariffRate" INTEGER NOT NULL DEFAULT 2000,
    "totalBeds" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 13: Beds
CREATE TABLE IF NOT EXISTS caresuite."beds" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "bedNo" VARCHAR(100) UNIQUE NOT NULL, -- e.g. "DLX-01", "GEN-10"
    "categoryId" UUID REFERENCES caresuite."bed_categories"("id") ON DELETE CASCADE,
    "status" VARCHAR(100) NOT NULL DEFAULT 'Vacant', -- "Vacant" | "Occupied" | "House Keeping" | "Retain" | "Blocked" | "Under Repair"
    "patientJson" TEXT, -- serialized JSON of active patient info
    "notes" TEXT,
    "cleaningStartedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 5. PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS "patients_firstName_idx" ON caresuite."patients"("firstName");
CREATE INDEX IF NOT EXISTS "patients_lastName_idx" ON caresuite."patients"("lastName");
CREATE INDEX IF NOT EXISTS "patients_fullName_idx" ON caresuite."patients"("fullName");
CREATE INDEX IF NOT EXISTS "patients_mobile_idx" ON caresuite."patients"("mobile");
CREATE INDEX IF NOT EXISTS "patients_aadhaarCard_idx" ON caresuite."patients"("aadhaarCard");

CREATE INDEX IF NOT EXISTS "invoices_uhid_idx" ON caresuite."invoices"("uhid");
CREATE INDEX IF NOT EXISTS "invoices_invoiceNo_idx" ON caresuite."invoices"("invoiceNo");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON caresuite."invoices"("status");

CREATE INDEX IF NOT EXISTS "receipts_invoiceId_idx" ON caresuite."receipts"("invoiceId");
CREATE INDEX IF NOT EXISTS "receipts_uhid_idx" ON caresuite."receipts"("uhid");

CREATE INDEX IF NOT EXISTS "op_visits_uhid_idx" ON caresuite."op_visits"("uhid");
CREATE INDEX IF NOT EXISTS "op_visits_visitNo_idx" ON caresuite."op_visits"("visitNo");

CREATE INDEX IF NOT EXISTS "billing_orders_uhid_idx" ON caresuite."billing_orders"("uhid");
CREATE INDEX IF NOT EXISTS "billing_orders_orderNo_idx" ON caresuite."billing_orders"("orderNo");
CREATE INDEX IF NOT EXISTS "billing_orders_status_idx" ON caresuite."billing_orders"("status");

CREATE INDEX IF NOT EXISTS "advance_collections_uhid_idx" ON caresuite."advance_collections"("uhid");
CREATE INDEX IF NOT EXISTS "advance_collections_advanceNo_idx" ON caresuite."advance_collections"("advanceNo");

CREATE INDEX IF NOT EXISTS "credit_notes_uhid_idx" ON caresuite."credit_notes"("uhid");
CREATE INDEX IF NOT EXISTS "credit_notes_invoiceNo_idx" ON caresuite."credit_notes"("invoiceNo");

CREATE INDEX IF NOT EXISTS "refund_records_uhid_idx" ON caresuite."refund_records"("uhid");
CREATE INDEX IF NOT EXISTS "refund_records_refundNo_idx" ON caresuite."refund_records"("refundNo");

CREATE INDEX IF NOT EXISTS "insurance_intimations_uhid_idx" ON caresuite."insurance_intimations"("uhid");
CREATE INDEX IF NOT EXISTS "insurance_intimations_claimNo_idx" ON caresuite."insurance_intimations"("claimNo");

CREATE INDEX IF NOT EXISTS "master_options_category_idx" ON caresuite."master_options"("category");

CREATE INDEX IF NOT EXISTS "bed_categories_sortOrder_idx" ON caresuite."bed_categories"("sortOrder");

CREATE INDEX IF NOT EXISTS "beds_categoryId_idx" ON caresuite."beds"("categoryId");
CREATE INDEX IF NOT EXISTS "beds_status_idx" ON caresuite."beds"("status");

-- =============================================================================
-- 6. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION caresuite.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set up Update Triggers
DROP TRIGGER IF EXISTS set_users_timestamp ON caresuite."users";
CREATE TRIGGER set_users_timestamp
BEFORE UPDATE ON caresuite."users"
FOR EACH ROW
EXECUTE FUNCTION caresuite.update_timestamp();

DROP TRIGGER IF EXISTS set_patients_timestamp ON caresuite."patients";
CREATE TRIGGER set_patients_timestamp
BEFORE UPDATE ON caresuite."patients"
FOR EACH ROW
EXECUTE FUNCTION caresuite.update_timestamp();

DROP TRIGGER IF EXISTS set_invoices_timestamp ON caresuite."invoices";
CREATE TRIGGER set_invoices_timestamp
BEFORE UPDATE ON caresuite."invoices"
FOR EACH ROW
EXECUTE FUNCTION caresuite.update_timestamp();

DROP TRIGGER IF EXISTS set_op_visits_timestamp ON caresuite."op_visits";
CREATE TRIGGER set_op_visits_timestamp
BEFORE UPDATE ON caresuite."op_visits"
FOR EACH ROW
EXECUTE FUNCTION caresuite.update_timestamp();

DROP TRIGGER IF EXISTS set_billing_orders_timestamp ON caresuite."billing_orders";
CREATE TRIGGER set_billing_orders_timestamp
BEFORE UPDATE ON caresuite."billing_orders"
FOR EACH ROW
EXECUTE FUNCTION caresuite.update_timestamp();

DROP TRIGGER IF EXISTS set_advance_collections_timestamp ON caresuite."advance_collections";
CREATE TRIGGER set_advance_collections_timestamp
BEFORE UPDATE ON caresuite."advance_collections"
FOR EACH ROW
EXECUTE FUNCTION caresuite.update_timestamp();

DROP TRIGGER IF EXISTS set_insurance_intimations_timestamp ON caresuite."insurance_intimations";
CREATE TRIGGER set_insurance_intimations_timestamp
BEFORE UPDATE ON caresuite."insurance_intimations"
FOR EACH ROW
EXECUTE FUNCTION caresuite.update_timestamp();

DROP TRIGGER IF EXISTS set_master_options_timestamp ON caresuite."master_options";
CREATE TRIGGER set_master_options_timestamp
BEFORE UPDATE ON caresuite."master_options"
FOR EACH ROW
EXECUTE FUNCTION caresuite.update_timestamp();

DROP TRIGGER IF EXISTS set_bed_categories_timestamp ON caresuite."bed_categories";
CREATE TRIGGER set_bed_categories_timestamp
BEFORE UPDATE ON caresuite."bed_categories"
FOR EACH ROW
EXECUTE FUNCTION caresuite.update_timestamp();

DROP TRIGGER IF EXISTS set_beds_timestamp ON caresuite."beds";
CREATE TRIGGER set_beds_timestamp
BEFORE UPDATE ON caresuite."beds"
FOR EACH ROW
EXECUTE FUNCTION caresuite.update_timestamp();
