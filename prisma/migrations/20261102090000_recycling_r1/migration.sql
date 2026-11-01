-- CreateEnum
CREATE TYPE "MaterialStream" AS ENUM ('PAPER_CARDBOARD', 'PET', 'HDPE_PP', 'PLASTIC_FILM', 'MIXED_PLASTIC', 'FERROUS', 'ALUMINIUM', 'GLASS', 'ORGANIC', 'WOOD', 'TEXTILE', 'INERT', 'SPECIAL', 'RESIDUAL');

-- CreateEnum
CREATE TYPE "RegulatoryClass" AS ENUM ('HOUSEHOLD_SIMILAR', 'INERT', 'SPECIAL', 'SPECIAL_HAZARDOUS');

-- CreateEnum
CREATE TYPE "DestinationKind" AS ENUM ('RECYCLER', 'SORTING_CENTRE', 'COMPOSTING', 'LANDFILL', 'INCINERATION', 'OTHER_DISPOSAL');

-- AlterTable
ALTER TABLE "WasteCategory" ADD COLUMN     "regulatoryClass" "RegulatoryClass" NOT NULL DEFAULT 'HOUSEHOLD_SIMILAR',
ADD COLUMN     "stream" "MaterialStream";

-- AlterTable
ALTER TABLE "WeightTicket" ADD COLUMN     "contaminated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "destinationId" TEXT,
ADD COLUMN     "rejectedKg" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "stream" "MaterialStream";

-- CreateTable
CREATE TABLE "Destination" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "DestinationKind" NOT NULL,
    "registrationNumber" TEXT,
    "wilaya" TEXT,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Destination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Destination_organizationId_name_key" ON "Destination"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Destination_organizationId_id_key" ON "Destination"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightTicket" ADD CONSTRAINT "WeightTicket_organizationId_destinationId_fkey" FOREIGN KEY ("organizationId", "destinationId") REFERENCES "Destination"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-written: rejects can never exceed the net weight.
ALTER TABLE "WeightTicket" ADD CONSTRAINT "WeightTicket_rejected" CHECK ("rejectedKg" >= 0 AND "rejectedKg" <= "netKg");

-- Classify the default categories created at registration (codes from server/reference-data.ts).
UPDATE "WasteCategory" SET "stream" = 'RESIDUAL' WHERE "code" = 'MSW' AND "stream" IS NULL;
UPDATE "WasteCategory" SET "stream" = 'PAPER_CARDBOARD' WHERE "code" = 'CARDBOARD' AND "stream" IS NULL;
UPDATE "WasteCategory" SET "stream" = 'MIXED_PLASTIC' WHERE "code" = 'PLASTIC' AND "stream" IS NULL;
UPDATE "WasteCategory" SET "stream" = 'FERROUS' WHERE "code" = 'METAL' AND "stream" IS NULL;
UPDATE "WasteCategory" SET "stream" = 'GLASS' WHERE "code" = 'GLASS' AND "stream" IS NULL;
UPDATE "WasteCategory" SET "stream" = 'ORGANIC' WHERE "code" = 'ORGANIC' AND "stream" IS NULL;
UPDATE "WasteCategory" SET "stream" = 'INERT', "regulatoryClass" = 'INERT' WHERE "code" = 'INERT';
UPDATE "WasteCategory" SET "stream" = 'SPECIAL', "regulatoryClass" = 'SPECIAL_HAZARDOUS' WHERE "code" = 'SPECIAL';
