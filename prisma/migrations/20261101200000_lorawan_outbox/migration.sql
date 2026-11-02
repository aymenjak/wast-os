-- CreateEnum
CREATE TYPE "LoraProvider" AS ENUM ('CHIRPSTACK', 'TTN');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failedAt" TIMESTAMPTZ(3),
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "IotIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "LoraProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastEventAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IotIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IotIntegration_keyHash_key" ON "IotIntegration"("keyHash");

-- CreateIndex
CREATE INDEX "IotIntegration_organizationId_idx" ON "IotIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "Notification_channel_sentAt_failedAt_nextAttemptAt_idx" ON "Notification"("channel", "sentAt", "failedAt", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "IotIntegration" ADD CONSTRAINT "IotIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "Notification" ADD CONSTRAINT "Notification_attempts" CHECK ("attempts" BETWEEN 0 AND 20);
