-- CreateEnum
CREATE TYPE "SupplierKind" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "BaleStatus" AS ENUM ('IN_STOCK', 'SOLD', 'VOID');

-- CreateEnum
CREATE TYPE "YardAdjustmentKind" AS ENUM ('OPENING', 'REJECT', 'CORRECTION');

-- CreateEnum
CREATE TYPE "MaterialSaleStatus" AS ENUM ('DRAFT', 'DELIVERED', 'SETTLED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Destination" ADD COLUMN     "ownYard" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MaterialSupplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "SupplierKind" NOT NULL DEFAULT 'INDIVIDUAL',
    "phone" TEXT,
    "registrationNumber" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPurchase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "yardId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalMinor" BIGINT NOT NULL,
    "paidAt" TIMESTAMPTZ(3),
    "voidedAt" TIMESTAMPTZ(3),
    "voidReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPurchaseLine" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "stream" "MaterialStream" NOT NULL,
    "grade" TEXT,
    "grossKg" DECIMAL(12,2) NOT NULL,
    "tareKg" DECIMAL(12,2) NOT NULL,
    "netKg" DECIMAL(12,2) NOT NULL,
    "unitPriceMinorPerKg" INTEGER NOT NULL,
    "amountMinor" BIGINT NOT NULL,

    CONSTRAINT "MaterialPurchaseLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bale" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "yardId" TEXT NOT NULL,
    "stream" "MaterialStream" NOT NULL,
    "grade" TEXT,
    "weightKg" DECIMAL(12,2) NOT NULL,
    "status" "BaleStatus" NOT NULL DEFAULT 'IN_STOCK',
    "saleId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YardAdjustment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "yardId" TEXT NOT NULL,
    "stream" "MaterialStream" NOT NULL,
    "kind" "YardAdjustmentKind" NOT NULL,
    "kg" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YardAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSale" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "yardId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "MaterialSaleStatus" NOT NULL DEFAULT 'DRAFT',
    "totalMinor" BIGINT NOT NULL,
    "deliveredAt" TIMESTAMPTZ(3),
    "buyerWeighedKg" DECIMAL(12,2),
    "claimKg" DECIMAL(12,2),
    "claimAmountMinor" BIGINT,
    "claimReason" TEXT,
    "settledAt" TIMESTAMPTZ(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSaleLine" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "stream" "MaterialStream" NOT NULL,
    "grade" TEXT,
    "baleId" TEXT,
    "weightKg" DECIMAL(12,2) NOT NULL,
    "unitPriceMinorPerKg" INTEGER NOT NULL,
    "amountMinor" BIGINT NOT NULL,

    CONSTRAINT "MaterialSaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialSupplier_organizationId_name_idx" ON "MaterialSupplier"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSupplier_organizationId_id_key" ON "MaterialSupplier"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialPurchase_organizationId_number_key" ON "MaterialPurchase"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialPurchase_organizationId_id_key" ON "MaterialPurchase"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Bale_organizationId_yardId_status_idx" ON "Bale"("organizationId", "yardId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Bale_organizationId_number_key" ON "Bale"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Bale_organizationId_id_key" ON "Bale"("organizationId", "id");

-- CreateIndex
CREATE INDEX "YardAdjustment_organizationId_yardId_stream_idx" ON "YardAdjustment"("organizationId", "yardId", "stream");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSale_organizationId_number_key" ON "MaterialSale"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSale_organizationId_id_key" ON "MaterialSale"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "MaterialSupplier" ADD CONSTRAINT "MaterialSupplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPurchase" ADD CONSTRAINT "MaterialPurchase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPurchase" ADD CONSTRAINT "MaterialPurchase_organizationId_yardId_fkey" FOREIGN KEY ("organizationId", "yardId") REFERENCES "Destination"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPurchase" ADD CONSTRAINT "MaterialPurchase_organizationId_supplierId_fkey" FOREIGN KEY ("organizationId", "supplierId") REFERENCES "MaterialSupplier"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPurchaseLine" ADD CONSTRAINT "MaterialPurchaseLine_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "MaterialPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bale" ADD CONSTRAINT "Bale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bale" ADD CONSTRAINT "Bale_organizationId_yardId_fkey" FOREIGN KEY ("organizationId", "yardId") REFERENCES "Destination"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bale" ADD CONSTRAINT "Bale_organizationId_saleId_fkey" FOREIGN KEY ("organizationId", "saleId") REFERENCES "MaterialSale"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YardAdjustment" ADD CONSTRAINT "YardAdjustment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YardAdjustment" ADD CONSTRAINT "YardAdjustment_organizationId_yardId_fkey" FOREIGN KEY ("organizationId", "yardId") REFERENCES "Destination"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSale" ADD CONSTRAINT "MaterialSale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSale" ADD CONSTRAINT "MaterialSale_organizationId_yardId_fkey" FOREIGN KEY ("organizationId", "yardId") REFERENCES "Destination"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSale" ADD CONSTRAINT "MaterialSale_organizationId_buyerId_fkey" FOREIGN KEY ("organizationId", "buyerId") REFERENCES "Destination"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSaleLine" ADD CONSTRAINT "MaterialSaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "MaterialSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- R2 integrity rules (also enforced in the services).
ALTER TABLE "MaterialPurchaseLine" ADD CONSTRAINT "MaterialPurchaseLine_weights" CHECK ("grossKg" > 0 AND "tareKg" >= 0 AND "netKg" = "grossKg" - "tareKg" AND "netKg" > 0);
ALTER TABLE "MaterialPurchaseLine" ADD CONSTRAINT "MaterialPurchaseLine_price" CHECK ("unitPriceMinorPerKg" >= 0 AND "amountMinor" >= 0);
ALTER TABLE "MaterialPurchase" ADD CONSTRAINT "MaterialPurchase_void" CHECK (("voidedAt" IS NULL) = ("voidReason" IS NULL));
ALTER TABLE "Bale" ADD CONSTRAINT "Bale_weight" CHECK ("weightKg" > 0);
ALTER TABLE "Bale" ADD CONSTRAINT "Bale_sold_has_sale" CHECK ("status" <> 'SOLD' OR "saleId" IS NOT NULL);
ALTER TABLE "YardAdjustment" ADD CONSTRAINT "YardAdjustment_sign" CHECK ("kg" <> 0 AND ("kind" = 'CORRECTION' OR "kg" > 0));
ALTER TABLE "MaterialSaleLine" ADD CONSTRAINT "MaterialSaleLine_values" CHECK ("weightKg" > 0 AND "unitPriceMinorPerKg" >= 0 AND "amountMinor" >= 0);
ALTER TABLE "MaterialSale" ADD CONSTRAINT "MaterialSale_claim" CHECK (("claimAmountMinor" IS NULL OR "claimAmountMinor" >= 0) AND ("claimKg" IS NULL OR "claimKg" >= 0) AND (("claimKg" IS NULL AND "claimAmountMinor" IS NULL) OR "claimReason" IS NOT NULL));
-- A bale can be on at most one sale line.
CREATE UNIQUE INDEX "MaterialSaleLine_baleId_key" ON "MaterialSaleLine"("baleId") WHERE "baleId" IS NOT NULL;
