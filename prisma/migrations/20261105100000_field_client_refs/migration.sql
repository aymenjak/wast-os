-- AlterTable
ALTER TABLE "EvidenceFile" ADD COLUMN     "clientRef" TEXT;

-- AlterTable
ALTER TABLE "WeightTicket" ADD COLUMN     "clientRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceFile_organizationId_clientRef_key" ON "EvidenceFile"("organizationId", "clientRef");

-- CreateIndex
CREATE UNIQUE INDEX "WeightTicket_organizationId_clientRef_key" ON "WeightTicket"("organizationId", "clientRef");

