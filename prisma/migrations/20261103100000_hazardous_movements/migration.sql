-- CreateEnum
CREATE TYPE "WasteConsistency" AS ENUM ('SOLID', 'LIQUID', 'GASEOUS', 'PASTY');

-- CreateEnum
CREATE TYPE "HazardousMovementStatus" AS ENUM ('DRAFT', 'IN_TRANSIT', 'DELIVERED', 'REFUSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "hazTransportAuthExpiresOn" DATE,
ADD COLUMN     "hazTransportAuthNumber" TEXT;

-- CreateTable
CREATE TABLE "HazardousMovement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "HazardousMovementStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT NOT NULL,
    "destinationId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "vehicleId" TEXT,
    "wasteCode" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "hazardCriteria" TEXT NOT NULL,
    "consistency" "WasteConsistency" NOT NULL,
    "quantityKg" DECIMAL(12,2) NOT NULL,
    "packaging" TEXT NOT NULL,
    "labelled" BOOLEAN NOT NULL DEFAULT false,
    "carrierAuthNumber" TEXT NOT NULL,
    "carrierAuthExpiresOn" DATE NOT NULL,
    "shipperSignedName" TEXT,
    "shipperSignedAt" TIMESTAMPTZ(3),
    "carrierSignedById" TEXT,
    "carrierSignedAt" TIMESTAMPTZ(3),
    "consigneeSignedName" TEXT,
    "consigneeSignedAt" TIMESTAMPTZ(3),
    "decontaminated" BOOLEAN NOT NULL DEFAULT false,
    "refusedByRole" TEXT,
    "refusalReason" TEXT,
    "refusedAt" TIMESTAMPTZ(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "HazardousMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HazardousMovement_organizationId_status_createdAt_idx" ON "HazardousMovement"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HazardousMovement_organizationId_number_key" ON "HazardousMovement"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "HazardousMovement_organizationId_id_key" ON "HazardousMovement"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "HazardousMovement" ADD CONSTRAINT "HazardousMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardousMovement" ADD CONSTRAINT "HazardousMovement_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardousMovement" ADD CONSTRAINT "HazardousMovement_organizationId_destinationId_fkey" FOREIGN KEY ("organizationId", "destinationId") REFERENCES "Destination"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardousMovement" ADD CONSTRAINT "HazardousMovement_organizationId_workOrderId_fkey" FOREIGN KEY ("organizationId", "workOrderId") REFERENCES "WorkOrder"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardousMovement" ADD CONSTRAINT "HazardousMovement_organizationId_vehicleId_fkey" FOREIGN KEY ("organizationId", "vehicleId") REFERENCES "Vehicle"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Décret 04-409 rules enforced at the database level as well as in the service.
ALTER TABLE "HazardousMovement" ADD CONSTRAINT "HazardousMovement_quantity_positive" CHECK ("quantityKg" > 0);
ALTER TABLE "HazardousMovement" ADD CONSTRAINT "HazardousMovement_status_evidence" CHECK (
  ("status" <> 'IN_TRANSIT' OR ("shipperSignedAt" IS NOT NULL AND "carrierSignedAt" IS NOT NULL AND "labelled"))
  AND ("status" <> 'DELIVERED' OR ("shipperSignedAt" IS NOT NULL AND "carrierSignedAt" IS NOT NULL AND "consigneeSignedAt" IS NOT NULL AND "decontaminated"))
  AND ("status" <> 'REFUSED' OR ("refusalReason" IS NOT NULL AND "refusedByRole" IN ('SHIPPER', 'CARRIER', 'CONSIGNEE')))
);
