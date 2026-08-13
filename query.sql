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

-- =============================================================================
-- 5. PERFORMANCE INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS "patients_firstName_idx" ON caresuite."patients"("firstName");
CREATE INDEX IF NOT EXISTS "patients_lastName_idx" ON caresuite."patients"("lastName");
CREATE INDEX IF NOT EXISTS "patients_fullName_idx" ON caresuite."patients"("fullName");
CREATE INDEX IF NOT EXISTS "patients_mobile_idx" ON caresuite."patients"("mobile");
CREATE INDEX IF NOT EXISTS "patients_aadhaarCard_idx" ON caresuite."patients"("aadhaarCard");

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
