-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PlatformInvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'VOID');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "chargilyMode" TEXT NOT NULL DEFAULT 'test',
ADD COLUMN     "chargilySecretEnc" TEXT,
ADD COLUMN     "suspendedByBilling" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpEnabledAt" TIMESTAMPTZ(3),
ADD COLUMN     "totpLastStep" INTEGER,
ADD COLUMN     "totpSecretEnc" TEXT;

-- CreateTable
CREATE TABLE "RecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecoveryCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginChallenge" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformInvoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "taxRateBps" INTEGER NOT NULL,
    "taxTotal" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "status" "PlatformInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "paidAt" TIMESTAMPTZ(3),
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "voidReason" TEXT,
    "checkoutExternalId" TEXT,
    "checkoutUrl" TEXT,
    "issuer" JSONB NOT NULL,
    "billTo" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformBillingSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "issuerName" TEXT,
    "issuerAddress" TEXT,
    "issuerTaxId" TEXT,
    "issuerTradeRegister" TEXT,
    "issuerStatId" TEXT,
    "taxRateBps" INTEGER NOT NULL DEFAULT 1900,
    "dueDays" INTEGER NOT NULL DEFAULT 15,
    "autoSuspend" BOOLEAN NOT NULL DEFAULT false,
    "graceDays" INTEGER NOT NULL DEFAULT 15,
    "lastInvoiceSeq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformBillingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryCode_codeHash_key" ON "RecoveryCode"("codeHash");

-- CreateIndex
CREATE INDEX "RecoveryCode_userId_idx" ON "RecoveryCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LoginChallenge_tokenHash_key" ON "LoginChallenge"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_number_key" ON "PlatformInvoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_checkoutExternalId_key" ON "PlatformInvoice"("checkoutExternalId");

-- CreateIndex
CREATE INDEX "PlatformInvoice_status_dueDate_idx" ON "PlatformInvoice"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformInvoice_organizationId_periodStart_key" ON "PlatformInvoice"("organizationId", "periodStart");

-- AddForeignKey
ALTER TABLE "RecoveryCode" ADD CONSTRAINT "RecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginChallenge" ADD CONSTRAINT "LoginChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written constraints (Prisma does not model CHECKs).
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_chargily_mode" CHECK ("chargilyMode" IN ('test', 'live'));
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_amounts" CHECK ("subtotal" >= 0 AND "taxTotal" >= 0 AND "total" = "subtotal" + "taxTotal");
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_period" CHECK ("periodEnd" > "periodStart" AND "dueDate" >= "issueDate");
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_paid" CHECK (("status" = 'PAID') = ("paidAt" IS NOT NULL));
ALTER TABLE "PlatformInvoice" ADD CONSTRAINT "PlatformInvoice_void" CHECK ("status" <> 'VOID' OR "voidReason" IS NOT NULL);
ALTER TABLE "PlatformBillingSettings" ADD CONSTRAINT "PlatformBillingSettings_singleton" CHECK ("id" = 1);
ALTER TABLE "PlatformBillingSettings" ADD CONSTRAINT "PlatformBillingSettings_ranges" CHECK ("taxRateBps" BETWEEN 0 AND 10000 AND "dueDays" BETWEEN 0 AND 120 AND "graceDays" BETWEEN 0 AND 365);
ALTER TABLE "LoginChallenge" ADD CONSTRAINT "LoginChallenge_attempts" CHECK ("attempts" >= 0);
INSERT INTO "PlatformBillingSettings" ("id") VALUES (1) ON CONFLICT DO NOTHING;
