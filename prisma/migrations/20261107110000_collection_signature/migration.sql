-- AlterEnum
ALTER TYPE "EvidenceKind" ADD VALUE 'SIGNATURE';

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "signedAt" TIMESTAMPTZ(3),
ADD COLUMN     "signerName" TEXT;


-- A signature always carries the signer's name and time.
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_signature_pair" CHECK (("signerName" IS NULL) = ("signedAt" IS NULL));
