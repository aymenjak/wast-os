-- Separate migration: PostgreSQL cannot use the enum value added in the previous migration inside the same transaction.
ALTER TABLE "HazardousMovement" ADD CONSTRAINT "HazardousMovement_reception" CHECK (
  ("refusedKg" IS NULL OR ("refusedKg" >= 0 AND "receivedKg" IS NOT NULL AND "refusedKg" <= "receivedKg"))
  AND ("receivedKg" IS NULL OR "receivedKg" > 0)
  AND ("refusedKg" IS NULL OR "refusedKg" = 0 OR "partialRefusalReason" IS NOT NULL)
);
ALTER TABLE "HazardousMovement" ADD CONSTRAINT "HazardousMovement_treated_evidence" CHECK (
  "status" <> 'TREATED' OR ("consigneeSignedAt" IS NOT NULL AND "decontaminated" AND "treatmentCode" IS NOT NULL AND "treatmentDate" IS NOT NULL AND "treatmentSignedName" IS NOT NULL)
);
