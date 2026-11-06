-- CreateEnum
CREATE TYPE "SurchargeKind" AS ENUM ('PERCENT', 'PER_COLLECTION');

-- AlterTable
ALTER TABLE "ContractServiceLine" ADD COLUMN     "minimumCharge" DECIMAL(14,2),
ADD COLUMN     "tiers" JSONB;

-- CreateTable
CREATE TABLE "ContractSurcharge" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "SurchargeKind" NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractSurcharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractSurcharge_organizationId_contractId_idx" ON "ContractSurcharge"("organizationId", "contractId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractSurcharge_organizationId_id_key" ON "ContractSurcharge"("organizationId", "id");

-- AddForeignKey
ALTER TABLE "ContractSurcharge" ADD CONSTRAINT "ContractSurcharge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractSurcharge" ADD CONSTRAINT "ContractSurcharge_organizationId_contractId_fkey" FOREIGN KEY ("organizationId", "contractId") REFERENCES "Contract"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written guards (D-90).
ALTER TABLE "ContractServiceLine" ADD CONSTRAINT "ContractServiceLine_minimum_nonneg" CHECK ("minimumCharge" IS NULL OR "minimumCharge" >= 0);
ALTER TABLE "ContractServiceLine" ADD CONSTRAINT "ContractServiceLine_tiers_array" CHECK ("tiers" IS NULL OR jsonb_typeof("tiers") = 'array');
ALTER TABLE "ContractSurcharge" ADD CONSTRAINT "ContractSurcharge_value_range" CHECK ("value" > 0 AND ("kind" <> 'PERCENT' OR "value" <= 100));
