-- CreateEnum
CREATE TYPE "VehicleDocumentKind" AS ENUM ('INSURANCE', 'TECHNICAL_INSPECTION', 'REGISTRATION', 'TRANSPORT_AUTHORISATION', 'OTHER');

-- CreateTable
CREATE TABLE "VehicleDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "kind" "VehicleDocumentKind" NOT NULL,
    "reference" TEXT,
    "issuer" TEXT,
    "issuedOn" DATE,
    "expiresOn" DATE,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleDocument_organizationId_vehicleId_kind_idx" ON "VehicleDocument"("organizationId", "vehicleId", "kind");

-- CreateIndex
CREATE INDEX "VehicleDocument_organizationId_expiresOn_idx" ON "VehicleDocument"("organizationId", "expiresOn");

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_organizationId_vehicleId_fkey" FOREIGN KEY ("organizationId", "vehicleId") REFERENCES "Vehicle"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written: an expiry date cannot precede the issue date.
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_dates" CHECK ("issuedOn" IS NULL OR "expiresOn" IS NULL OR "expiresOn" >= "issuedOn");
