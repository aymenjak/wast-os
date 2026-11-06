-- AlterTable
ALTER TABLE "InvoiceLine" ADD COLUMN     "contractLineId" TEXT,
ADD COLUMN     "periodMonth" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_organizationId_contractLineId_periodMonth_key" ON "InvoiceLine"("organizationId", "contractLineId", "periodMonth");

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_contractLineId_fkey" FOREIGN KEY ("organizationId", "contractLineId") REFERENCES "ContractServiceLine"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A period line names both the contract line and a valid month (YYYY-MM), or neither.
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_period_pair" CHECK (
  ("contractLineId" IS NULL AND "periodMonth" IS NULL)
  OR ("contractLineId" IS NOT NULL AND "periodMonth" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
  OR ("contractLineId" IS NULL AND "periodMonth" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);
