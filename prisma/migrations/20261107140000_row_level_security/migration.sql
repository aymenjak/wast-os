-- Row-level security (D-91), defence in depth under the application's own organizationId filters.
-- The application sets app.org_id at every connection checkout (server/db.ts): an organization id inside a tenant
-- request, '*' outside one (platform console, webhooks, public pages, jobs). Unset (another client) sees nothing.
-- Not FORCEd: the table owner (migrations, seed, admin scripts) is not restricted; the least-privilege application
-- role (scripts/ops/db-roles.sql, NOBYPASSRLS) is. Membership, Invitation and SupportAccessGrant are read across
-- organizations by sign-in, the organization switcher and the support console, and stay outside.
-- Every new table with an organizationId must be added here or to the exclusion list (checked by rls.test.ts).

ALTER TABLE "AiChatMessage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AiChatMessage_tenant" ON "AiChatMessage"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "AiConversation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AiConversation_tenant" ON "AiConversation"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "AiSuggestion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AiSuggestion_tenant" ON "AiSuggestion"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AuditEvent_tenant" ON "AuditEvent"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Bale" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bale_tenant" ON "Bale"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branch_tenant" ON "Branch"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "CivicReport" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CivicReport_tenant" ON "CivicReport"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "CollectionRequest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CollectionRequest_tenant" ON "CollectionRequest"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Container" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Container_tenant" ON "Container"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "ContainerMovement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ContainerMovement_tenant" ON "ContainerMovement"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contract_tenant" ON "Contract"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "ContractServiceLine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ContractServiceLine_tenant" ON "ContractServiceLine"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "ContractSurcharge" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ContractSurcharge_tenant" ON "ContractSurcharge"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Counter" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Counter_tenant" ON "Counter"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer_tenant" ON "Customer"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "CustomerContact" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CustomerContact_tenant" ON "CustomerContact"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "CustomerNote" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CustomerNote_tenant" ON "CustomerNote"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Destination" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Destination_tenant" ON "Destination"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "DropOffPoint" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "DropOffPoint_tenant" ON "DropOffPoint"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "EvidenceFile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "EvidenceFile_tenant" ON "EvidenceFile"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "HazTransportAuthorisation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HazTransportAuthorisation_tenant" ON "HazTransportAuthorisation"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "HazardousMovement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HazardousMovement_tenant" ON "HazardousMovement"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invoice_tenant" ON "Invoice"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "InvoiceLine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "InvoiceLine_tenant" ON "InvoiceLine"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "IotAlert" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "IotAlert_tenant" ON "IotAlert"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "IotDevice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "IotDevice_tenant" ON "IotDevice"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "IotIntegration" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "IotIntegration_tenant" ON "IotIntegration"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "MaterialPurchase" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MaterialPurchase_tenant" ON "MaterialPurchase"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "MaterialSale" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MaterialSale_tenant" ON "MaterialSale"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "MaterialSupplier" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MaterialSupplier_tenant" ON "MaterialSupplier"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notification_tenant" ON "Notification"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payment_tenant" ON "Payment"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "PaymentCheckout" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PaymentCheckout_tenant" ON "PaymentCheckout"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "PlatformInvoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PlatformInvoice_tenant" ON "PlatformInvoice"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "SensorReading" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SensorReading_tenant" ON "SensorReading"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "ServiceLocation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ServiceLocation_tenant" ON "ServiceLocation"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "ServiceZone" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ServiceZone_tenant" ON "ServiceZone"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "SortingCampaign" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SortingCampaign_tenant" ON "SortingCampaign"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "StockItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "StockItem_tenant" ON "StockItem"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "StockMovement_tenant" ON "StockMovement"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "StockPurchase" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "StockPurchase_tenant" ON "StockPurchase"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "StockSupplier" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "StockSupplier_tenant" ON "StockSupplier"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subscription_tenant" ON "Subscription"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SupportTicket_tenant" ON "SupportTicket"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team_tenant" ON "Team"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vehicle_tenant" ON "Vehicle"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "VehicleDocument" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "VehicleDocument_tenant" ON "VehicleDocument"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "VehicleMaintenance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "VehicleMaintenance_tenant" ON "VehicleMaintenance"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "VehiclePosition" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "VehiclePosition_tenant" ON "VehiclePosition"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "WasteCategory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WasteCategory_tenant" ON "WasteCategory"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "WeightTicket" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WeightTicket_tenant" ON "WeightTicket"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "WorkOrder" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WorkOrder_tenant" ON "WorkOrder"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));

ALTER TABLE "YardAdjustment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "YardAdjustment_tenant" ON "YardAdjustment"
  USING (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true))
  WITH CHECK (current_setting('app.org_id', true) = '*' OR "organizationId" = current_setting('app.org_id', true));
