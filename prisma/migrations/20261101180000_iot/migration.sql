-- CreateEnum
CREATE TYPE "DeviceKind" AS ENUM ('FILL_SENSOR', 'GPS_TRACKER');

-- CreateEnum
CREATE TYPE "IotAlertKind" AS ENUM ('FILL_HIGH', 'BATTERY_LOW', 'FIRE_RISK');

-- AlterTable
ALTER TABLE "Container" ADD COLUMN     "fillThresholdPct" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN     "lastFillAt" TIMESTAMPTZ(3),
ADD COLUMN     "lastFillPct" INTEGER;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "lastLatitude" DECIMAL(9,6),
ADD COLUMN     "lastLongitude" DECIMAL(9,6),
ADD COLUMN     "lastPositionAt" TIMESTAMPTZ(3),
ADD COLUMN     "lastSpeedKmh" INTEGER;

-- CreateTable
CREATE TABLE "IotDevice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "DeviceKind" NOT NULL,
    "name" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "containerId" TEXT,
    "vehicleId" TEXT,
    "lastSeenAt" TIMESTAMPTZ(3),
    "batteryPct" INTEGER,
    "revokedAt" TIMESTAMPTZ(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IotDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorReading" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "containerId" TEXT,
    "fillPct" INTEGER,
    "temperatureC" DECIMAL(5,1),
    "batteryPct" INTEGER,
    "measuredAt" TIMESTAMPTZ(3) NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensorReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiclePosition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "speedKmh" INTEGER,
    "heading" INTEGER,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehiclePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IotAlert" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "IotAlertKind" NOT NULL,
    "deviceId" TEXT NOT NULL,
    "containerId" TEXT,
    "value" DECIMAL(6,1) NOT NULL,
    "openedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolvedById" TEXT,
    "autoResolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "IotAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IotDevice_keyHash_key" ON "IotDevice"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "IotDevice_organizationId_serial_key" ON "IotDevice"("organizationId", "serial");

-- CreateIndex
CREATE UNIQUE INDEX "IotDevice_organizationId_id_key" ON "IotDevice"("organizationId", "id");

-- CreateIndex
CREATE INDEX "SensorReading_organizationId_containerId_measuredAt_idx" ON "SensorReading"("organizationId", "containerId", "measuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "SensorReading_deviceId_measuredAt_key" ON "SensorReading"("deviceId", "measuredAt");

-- CreateIndex
CREATE INDEX "VehiclePosition_organizationId_vehicleId_recordedAt_idx" ON "VehiclePosition"("organizationId", "vehicleId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VehiclePosition_deviceId_recordedAt_key" ON "VehiclePosition"("deviceId", "recordedAt");

-- CreateIndex
CREATE INDEX "IotAlert_organizationId_resolvedAt_idx" ON "IotAlert"("organizationId", "resolvedAt");

-- AddForeignKey
ALTER TABLE "IotDevice" ADD CONSTRAINT "IotDevice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IotDevice" ADD CONSTRAINT "IotDevice_organizationId_containerId_fkey" FOREIGN KEY ("organizationId", "containerId") REFERENCES "Container"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IotDevice" ADD CONSTRAINT "IotDevice_organizationId_vehicleId_fkey" FOREIGN KEY ("organizationId", "vehicleId") REFERENCES "Vehicle"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_organizationId_deviceId_fkey" FOREIGN KEY ("organizationId", "deviceId") REFERENCES "IotDevice"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_organizationId_containerId_fkey" FOREIGN KEY ("organizationId", "containerId") REFERENCES "Container"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePosition" ADD CONSTRAINT "VehiclePosition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePosition" ADD CONSTRAINT "VehiclePosition_organizationId_deviceId_fkey" FOREIGN KEY ("organizationId", "deviceId") REFERENCES "IotDevice"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePosition" ADD CONSTRAINT "VehiclePosition_organizationId_vehicleId_fkey" FOREIGN KEY ("organizationId", "vehicleId") REFERENCES "Vehicle"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IotAlert" ADD CONSTRAINT "IotAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IotAlert" ADD CONSTRAINT "IotAlert_organizationId_deviceId_fkey" FOREIGN KEY ("organizationId", "deviceId") REFERENCES "IotDevice"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IotAlert" ADD CONSTRAINT "IotAlert_organizationId_containerId_fkey" FOREIGN KEY ("organizationId", "containerId") REFERENCES "Container"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-written constraints.
ALTER TABLE "IotDevice" ADD CONSTRAINT "IotDevice_link" CHECK (
  ("kind" = 'FILL_SENSOR' AND "vehicleId" IS NULL) OR ("kind" = 'GPS_TRACKER' AND "containerId" IS NULL));
ALTER TABLE "IotDevice" ADD CONSTRAINT "IotDevice_battery" CHECK ("batteryPct" IS NULL OR "batteryPct" BETWEEN 0 AND 100);
ALTER TABLE "SensorReading" ADD CONSTRAINT "SensorReading_ranges" CHECK (
  ("fillPct" IS NULL OR "fillPct" BETWEEN 0 AND 100) AND ("batteryPct" IS NULL OR "batteryPct" BETWEEN 0 AND 100)
  AND ("temperatureC" IS NULL OR "temperatureC" BETWEEN -60 AND 200));
ALTER TABLE "VehiclePosition" ADD CONSTRAINT "VehiclePosition_ranges" CHECK (
  "latitude" BETWEEN -90 AND 90 AND "longitude" BETWEEN -180 AND 180 AND ("speedKmh" IS NULL OR "speedKmh" BETWEEN 0 AND 300)
  AND ("heading" IS NULL OR "heading" BETWEEN 0 AND 359));
ALTER TABLE "Container" ADD CONSTRAINT "Container_fill" CHECK ("fillThresholdPct" BETWEEN 10 AND 100 AND ("lastFillPct" IS NULL OR "lastFillPct" BETWEEN 0 AND 100));
-- At most one open alert of a kind per device.
CREATE UNIQUE INDEX "IotAlert_one_open" ON "IotAlert" ("deviceId", "kind") WHERE "resolvedAt" IS NULL;
