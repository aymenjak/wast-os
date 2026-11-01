-- AlterTable
ALTER TABLE "HazardousMovement" ADD COLUMN     "authorisationId" TEXT,
ADD COLUMN     "originAddress" TEXT,
ADD COLUMN     "packageCount" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "HazTransportAuthorisation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "validFrom" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "wasteCodes" TEXT[],
    "vehicleIds" TEXT[],
    "loadingPoint" TEXT NOT NULL,
    "unloadingPoint" TEXT NOT NULL,
    "itinerary" TEXT,
    "crew" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HazTransportAuthorisation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HazTransportAuthorisation_organizationId_number_key" ON "HazTransportAuthorisation"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "HazTransportAuthorisation_organizationId_id_key" ON "HazTransportAuthorisation"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "HazardousMovement" ADD CONSTRAINT "HazardousMovement_organizationId_authorisationId_fkey" FOREIGN KEY ("organizationId", "authorisationId") REFERENCES "HazTransportAuthorisation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazTransportAuthorisation" ADD CONSTRAINT "HazTransportAuthorisation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "HazTransportAuthorisation" ADD CONSTRAINT "HazTransportAuthorisation_period" CHECK ("validUntil" >= "validFrom");
ALTER TABLE "HazTransportAuthorisation" ADD CONSTRAINT "HazTransportAuthorisation_has_scope" CHECK (cardinality("wasteCodes") > 0 AND cardinality("vehicleIds") > 0);
ALTER TABLE "HazardousMovement" ADD CONSTRAINT "HazardousMovement_packages_positive" CHECK ("packageCount" > 0);
