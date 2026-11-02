
-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('OWNER', 'ADMIN', 'SUPPORT');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "suspendedAt" TIMESTAMPTZ(3),
ADD COLUMN     "suspendedReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "platformRole" "PlatformRole";


-- Existing support staff keep their access as SUPPORT.
UPDATE "User" SET "platformRole" = 'SUPPORT' WHERE "isPlatformStaff" = true AND "platformRole" IS NULL;

-- One source of truth: staff flag and role always agree.
ALTER TABLE "User" ADD CONSTRAINT "User_platform_role_consistent" CHECK ("isPlatformStaff" = ("platformRole" IS NOT NULL));

-- A suspension always carries a reason.
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_suspension_reason" CHECK ("suspendedAt" IS NULL OR "suspendedReason" IS NOT NULL);
