-- AlterTable
ALTER TABLE "Container" ADD COLUMN     "dropOffPointId" TEXT,
ADD COLUMN     "stream" "MaterialStream";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "recoveryTargetLabel" TEXT,
ADD COLUMN     "recoveryTargetPct" INTEGER,
ADD COLUMN     "recoveryTargetYear" INTEGER;

-- CreateTable
CREATE TABLE "DropOffPoint" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commune" TEXT,
    "wilaya" TEXT,
    "address" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DropOffPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SortingCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "streams" "MaterialStream"[],
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SortingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DropOffPoint_organizationId_name_key" ON "DropOffPoint"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "DropOffPoint_organizationId_id_key" ON "DropOffPoint"("organizationId", "id");

-- CreateIndex
CREATE INDEX "SortingCampaign_organizationId_commune_idx" ON "SortingCampaign"("organizationId", "commune");

-- AddForeignKey
ALTER TABLE "DropOffPoint" ADD CONSTRAINT "DropOffPoint_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortingCampaign" ADD CONSTRAINT "SortingCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Container" ADD CONSTRAINT "Container_organizationId_dropOffPointId_fkey" FOREIGN KEY ("organizationId", "dropOffPointId") REFERENCES "DropOffPoint"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "Container" ADD CONSTRAINT "Container_one_place" CHECK ("serviceLocationId" IS NULL OR "dropOffPointId" IS NULL);
ALTER TABLE "DropOffPoint" ADD CONSTRAINT "DropOffPoint_coordinates" CHECK ("latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180);
ALTER TABLE "SortingCampaign" ADD CONSTRAINT "SortingCampaign_period" CHECK ("endsOn" >= "startsOn" AND cardinality("streams") > 0);
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_recovery_target" CHECK (("recoveryTargetPct" IS NULL OR "recoveryTargetPct" BETWEEN 1 AND 100) AND (("recoveryTargetPct" IS NULL) = ("recoveryTargetYear" IS NULL)));
