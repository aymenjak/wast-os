-- CreateEnum
CREATE TYPE "ContainerType" AS ENUM ('BIN_240L', 'BIN_660L', 'BIN_1100L', 'SKIP_6M3', 'SKIP_10M3', 'ROLLOFF_20M3', 'ROLLOFF_30M3', 'COMPACTOR_UNIT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContainerStatus" AS ENUM ('IN_YARD', 'AT_CUSTOMER', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "ContainerMoveKind" AS ENUM ('DELIVERED', 'REMOVED', 'TO_MAINTENANCE', 'BACK_IN_SERVICE', 'RETIRED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "workingWeekdays" INTEGER[] DEFAULT ARRAY[7, 1, 2, 3, 4]::INTEGER[];

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "contractLineId" TEXT;

-- CreateTable
CREATE TABLE "Container" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ContainerType" NOT NULL,
    "status" "ContainerStatus" NOT NULL DEFAULT 'IN_YARD',
    "serviceLocationId" TEXT,
    "placedAt" TIMESTAMPTZ(3),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Container_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContainerMovement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "kind" "ContainerMoveKind" NOT NULL,
    "serviceLocationId" TEXT,
    "workOrderId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "notes" TEXT,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContainerMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Container_organizationId_status_idx" ON "Container"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Container_organizationId_code_key" ON "Container"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Container_organizationId_id_key" ON "Container"("organizationId", "id");

-- CreateIndex
CREATE INDEX "ContainerMovement_organizationId_containerId_occurredAt_idx" ON "ContainerMovement"("organizationId", "containerId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractServiceLine_organizationId_id_key" ON "ContractServiceLine"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_contractLineId_scheduledDate_key" ON "WorkOrder"("contractLineId", "scheduledDate");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_contractLineId_fkey" FOREIGN KEY ("organizationId", "contractLineId") REFERENCES "ContractServiceLine"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Container" ADD CONSTRAINT "Container_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Container" ADD CONSTRAINT "Container_organizationId_serviceLocationId_fkey" FOREIGN KEY ("organizationId", "serviceLocationId") REFERENCES "ServiceLocation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerMovement" ADD CONSTRAINT "ContainerMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerMovement" ADD CONSTRAINT "ContainerMovement_organizationId_containerId_fkey" FOREIGN KEY ("organizationId", "containerId") REFERENCES "Container"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerMovement" ADD CONSTRAINT "ContainerMovement_organizationId_serviceLocationId_fkey" FOREIGN KEY ("organizationId", "serviceLocationId") REFERENCES "ServiceLocation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContainerMovement" ADD CONSTRAINT "ContainerMovement_organizationId_workOrderId_fkey" FOREIGN KEY ("organizationId", "workOrderId") REFERENCES "WorkOrder"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A container at a customer must reference the location it sits at.
ALTER TABLE "Container" ADD CONSTRAINT "Container_location_when_placed" CHECK ("status" <> 'AT_CUSTOMER' OR "serviceLocationId" IS NOT NULL);
