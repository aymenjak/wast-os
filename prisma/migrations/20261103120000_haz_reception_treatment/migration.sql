-- AlterEnum
ALTER TYPE "HazardousMovementStatus" ADD VALUE 'TREATED';

-- AlterTable
ALTER TABLE "HazardousMovement" ADD COLUMN     "partialRefusalReason" TEXT,
ADD COLUMN     "plannedOperation" TEXT,
ADD COLUMN     "quantityEstimated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receivedKg" DECIMAL(12,2),
ADD COLUMN     "refusedKg" DECIMAL(12,2),
ADD COLUMN     "treatmentCode" TEXT,
ADD COLUMN     "treatmentDate" DATE,
ADD COLUMN     "treatmentSignedAt" TIMESTAMPTZ(3),
ADD COLUMN     "treatmentSignedName" TEXT;

