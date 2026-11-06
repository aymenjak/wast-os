-- CreateEnum
CREATE TYPE "StockCategory" AS ENUM ('SPARE_PART', 'LUBRICANT', 'TYRE', 'CLEANING', 'PPE', 'CONSUMABLE', 'OTHER');

-- CreateEnum
CREATE TYPE "StockUnit" AS ENUM ('UNIT', 'LITRE', 'KG', 'PAIR', 'BOX', 'ROLL', 'METRE');

-- CreateEnum
CREATE TYPE "StockMovementKind" AS ENUM ('OPENING', 'RECEIPT', 'ISSUE', 'ADJUSTMENT', 'RECEIPT_VOID');

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "StockCategory" NOT NULL,
    "unit" "StockUnit" NOT NULL,
    "reorderLevel" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSupplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "taxId" TEXT,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPurchase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierInvoiceRef" TEXT,
    "receivedOn" DATE NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "vatMinor" BIGINT NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMPTZ(3),
    "voidedAt" TIMESTAMPTZ(3),
    "voidReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "kind" "StockMovementKind" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "valueMinor" BIGINT NOT NULL,
    "unitCostMinor" BIGINT,
    "purchaseId" TEXT,
    "vehicleId" TEXT,
    "reason" TEXT,
    "occurredOn" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockItem_organizationId_category_idx" ON "StockItem"("organizationId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_organizationId_code_key" ON "StockItem"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_organizationId_id_key" ON "StockItem"("organizationId", "id");

-- CreateIndex
CREATE INDEX "StockSupplier_organizationId_name_idx" ON "StockSupplier"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StockSupplier_organizationId_id_key" ON "StockSupplier"("organizationId", "id");

-- CreateIndex
CREATE INDEX "StockPurchase_organizationId_receivedOn_idx" ON "StockPurchase"("organizationId", "receivedOn");

-- CreateIndex
CREATE UNIQUE INDEX "StockPurchase_organizationId_number_key" ON "StockPurchase"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "StockPurchase_organizationId_id_key" ON "StockPurchase"("organizationId", "id");

-- CreateIndex
CREATE INDEX "StockMovement_organizationId_itemId_occurredOn_idx" ON "StockMovement"("organizationId", "itemId", "occurredOn");

-- CreateIndex
CREATE INDEX "StockMovement_organizationId_vehicleId_occurredOn_idx" ON "StockMovement"("organizationId", "vehicleId", "occurredOn");

-- CreateIndex
CREATE INDEX "StockMovement_organizationId_purchaseId_idx" ON "StockMovement"("organizationId", "purchaseId");

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSupplier" ADD CONSTRAINT "StockSupplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPurchase" ADD CONSTRAINT "StockPurchase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPurchase" ADD CONSTRAINT "StockPurchase_organizationId_supplierId_fkey" FOREIGN KEY ("organizationId", "supplierId") REFERENCES "StockSupplier"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_itemId_fkey" FOREIGN KEY ("organizationId", "itemId") REFERENCES "StockItem"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_purchaseId_fkey" FOREIGN KEY ("organizationId", "purchaseId") REFERENCES "StockPurchase"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_vehicleId_fkey" FOREIGN KEY ("organizationId", "vehicleId") REFERENCES "Vehicle"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ── Hand-written integrity rules (STOCK.md) ──
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_reorder_nonneg" CHECK ("reorderLevel" >= 0);
ALTER TABLE "StockPurchase" ADD CONSTRAINT "StockPurchase_amounts_nonneg" CHECK ("totalMinor" >= 0 AND "vatMinor" >= 0);
ALTER TABLE "StockPurchase" ADD CONSTRAINT "StockPurchase_void_reason" CHECK ("voidedAt" IS NULL OR "voidReason" IS NOT NULL);

-- Sign of quantity and value follows the movement kind; receipts belong to a purchase; issues alone may name a vehicle.
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_sign_by_kind" CHECK (
  ("kind" IN ('OPENING', 'RECEIPT') AND "quantity" > 0 AND "valueMinor" >= 0)
  OR ("kind" IN ('ISSUE', 'RECEIPT_VOID') AND "quantity" < 0 AND "valueMinor" <= 0)
  OR ("kind" = 'ADJUSTMENT' AND "quantity" <> 0 AND sign("valueMinor") * sign("quantity") >= 0)
);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_purchase_link" CHECK (
  ("kind" IN ('RECEIPT', 'RECEIPT_VOID')) = ("purchaseId" IS NOT NULL)
);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_vehicle_only_on_issue" CHECK ("vehicleId" IS NULL OR "kind" = 'ISSUE');
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_adjustment_reason" CHECK ("kind" <> 'ADJUSTMENT' OR "reason" IS NOT NULL);

-- The ledger is append-only: corrections are new ADJUSTMENT or RECEIPT_VOID rows, never edits (TRUNCATE stays possible).
CREATE OR REPLACE FUNCTION nexvo_stock_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'StockMovement is append-only (% refused)', TG_OP USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "StockMovement_append_only"
  BEFORE UPDATE OR DELETE ON "StockMovement"
  FOR EACH ROW EXECUTE FUNCTION nexvo_stock_append_only();
