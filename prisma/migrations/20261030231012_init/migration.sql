-- Extensions (require a role allowed to create them; managed Postgres providers expose this to the admin role).
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "OrganizationKind" AS ENUM ('SERVICE_PROVIDER', 'MUNICIPALITY');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'DISPATCHER', 'FIELD_WORKER', 'FINANCE', 'VIEWER', 'CIVIC_REVIEWER', 'CUSTOMER_PORTAL');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerKind" AS ENUM ('BUSINESS', 'INSTITUTION', 'RESIDENTIAL');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "BillingUnit" AS ENUM ('PER_COLLECTION', 'PER_TONNE', 'PER_MONTH');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('ON_DEMAND', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "QuantityUnit" AS ENUM ('KG', 'TONNE', 'CUBIC_METRE', 'CONTAINER', 'BAG');

-- CreateEnum
CREATE TYPE "TimeWindow" AS ENUM ('ANY', 'MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'VALIDATED', 'REJECTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequestSource" AS ENUM ('STAFF', 'PORTAL');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('COMPACTOR', 'TIPPER', 'SKIP_LOADER', 'HOOK_LIFT', 'VAN', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_SERVICE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "MaintenanceKind" AS ENUM ('MAINTENANCE', 'INSPECTION', 'REPAIR');

-- CreateEnum
CREATE TYPE "WorkOrderKind" AS ENUM ('COLLECTION', 'CIVIC_INTERVENTION');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "FailureReason" AS ENUM ('NO_ACCESS', 'CUSTOMER_ABSENT', 'WASTE_NOT_READY', 'WRONG_WASTE_TYPE', 'VEHICLE_BREAKDOWN', 'UNSAFE_CONDITIONS', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('BEFORE', 'AFTER', 'DOCUMENT', 'REPORT_PHOTO');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD_ONLINE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('MANUAL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('RECORDED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'CITIZEN');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "CivicCategory" AS ENUM ('ILLEGAL_DUMPING', 'OVERFLOWING_BIN', 'MISSED_COLLECTION', 'SANITATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CivicReportStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CONFIRMED', 'REJECTED', 'DUPLICATE', 'DISPUTED', 'REOPENED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeOrganizationId" TEXT,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "OrganizationKind" NOT NULL DEFAULT 'SERVICE_PROVIDER',
    "legalName" TEXT,
    "taxId" TEXT,
    "statisticalId" TEXT,
    "tradeRegister" TEXT,
    "address" TEXT,
    "wilaya" TEXT,
    "commune" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "country" TEXT NOT NULL DEFAULT 'DZ',
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Algiers',
    "defaultLocale" TEXT NOT NULL DEFAULT 'fr',
    "defaultTaxRateBps" INTEGER NOT NULL DEFAULT 1900,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "civicSlaHours" INTEGER NOT NULL DEFAULT 72,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "customerId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "customerId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthly" DECIMAL(14,2) NOT NULL,
    "priceYearly" DECIMAL(14,2) NOT NULL,
    "maxUsers" INTEGER NOT NULL,
    "maxVehicles" INTEGER NOT NULL,
    "maxCustomers" INTEGER NOT NULL,
    "customerPortal" BOOLEAN NOT NULL DEFAULT false,
    "advancedReports" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "currentPeriodEnd" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wilaya" TEXT,
    "commune" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceZone" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "wilaya" TEXT,
    "commune" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CustomerKind" NOT NULL DEFAULT 'BUSINESS',
    "taxId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "billingAddress" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "serviceConditions" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jobTitle" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceLocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "commune" TEXT,
    "wilaya" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "geog" geography(Point, 4326),
    "accessNotes" TEXT,
    "serviceZoneId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameFr" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "hazardous" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WasteCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "renewalNoticeDays" INTEGER NOT NULL DEFAULT 30,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "serviceScope" TEXT,
    "slaResponseHours" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractServiceLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "serviceLocationId" TEXT NOT NULL,
    "wasteCategoryId" TEXT NOT NULL,
    "frequency" "Frequency" NOT NULL DEFAULT 'WEEKLY',
    "weekdays" INTEGER[],
    "billingUnit" "BillingUnit" NOT NULL DEFAULT 'PER_COLLECTION',
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "estimatedQuantity" DECIMAL(12,3),

    CONSTRAINT "ContractServiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceLocationId" TEXT NOT NULL,
    "contractId" TEXT,
    "wasteCategoryId" TEXT NOT NULL,
    "estimatedQuantity" DECIMAL(12,3),
    "quantityUnit" "QuantityUnit" NOT NULL DEFAULT 'CONTAINER',
    "preferredDate" DATE NOT NULL,
    "preferredWindow" "TimeWindow" NOT NULL DEFAULT 'ANY',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "source" "RequestSource" NOT NULL DEFAULT 'STAFF',
    "rejectionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CollectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "teamId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("teamId","membershipId")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL DEFAULT 'COMPACTOR',
    "capacityKg" INTEGER,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "restrictions" TEXT,
    "odometerKm" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMaintenance" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "kind" "MaintenanceKind" NOT NULL,
    "performedAt" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "cost" DECIMAL(14,2),
    "odometerKm" INTEGER,
    "nextDueAt" DATE,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" "WorkOrderKind" NOT NULL DEFAULT 'COLLECTION',
    "collectionRequestId" TEXT,
    "civicReportId" TEXT,
    "customerId" TEXT,
    "serviceLocationId" TEXT,
    "contractId" TEXT,
    "wasteCategoryId" TEXT,
    "teamId" TEXT,
    "vehicleId" TEXT,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "scheduledDate" DATE NOT NULL,
    "actualStart" TIMESTAMPTZ(3),
    "actualEnd" TIMESTAMPTZ(3),
    "instructions" TEXT,
    "completionNotes" TEXT,
    "failureReason" "FailureReason",
    "failureNotes" TEXT,
    "customerConfirmedAt" TIMESTAMPTZ(3),
    "disputeReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightTicket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "ticketNumber" TEXT,
    "grossKg" DECIMAL(12,2) NOT NULL,
    "tareKg" DECIMAL(12,2) NOT NULL,
    "netKg" DECIMAL(12,2) NOT NULL,
    "facility" TEXT,
    "weighedAt" TIMESTAMPTZ(3) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceFile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "workOrderId" TEXT,
    "civicReportId" TEXT,
    "contractId" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT,
    "customerId" TEXT NOT NULL,
    "contractId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "issueDate" DATE,
    "dueDate" DATE,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "billToName" TEXT,
    "billToTaxId" TEXT,
    "billToAddress" TEXT,
    "voidReason" TEXT,
    "createdById" TEXT NOT NULL,
    "issuedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "taxRateBps" INTEGER NOT NULL,
    "lineSubtotal" DECIMAL(14,2) NOT NULL,
    "lineTax" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "workOrderId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL,
    "source" "PaymentSource" NOT NULL DEFAULT 'MANUAL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'RECORDED',
    "idempotencyKey" TEXT NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),
    "outcome" TEXT,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counter" (
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("organizationId","name")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorType" "ActorType" NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "recipient" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CivicReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "clientSubmissionId" TEXT NOT NULL,
    "category" "CivicCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "geog" geography(Point, 4326),
    "addressHint" TEXT,
    "serviceZoneId" TEXT,
    "status" "CivicReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "reporterName" TEXT,
    "reporterContact" TEXT,
    "duplicateOfId" TEXT,
    "rejectionReason" TEXT,
    "disputeReason" TEXT,
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    "verifiedAt" TIMESTAMPTZ(3),
    "slaDueAt" TIMESTAMPTZ(3),
    "resolvedAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CivicReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CivicReportEvent" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "fromStatus" "CivicReportStatus",
    "toStatus" "CivicReportStatus" NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorUserId" TEXT,
    "publicNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CivicReportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_organizationId_userId_key" ON "Membership"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_email_idx" ON "Invitation"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_organizationId_name_key" ON "Branch"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceZone_organizationId_code_key" ON "ServiceZone"("organizationId", "code");

-- CreateIndex
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_code_key" ON "Customer"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_id_key" ON "Customer"("organizationId", "id");

-- CreateIndex
CREATE INDEX "CustomerContact_organizationId_customerId_idx" ON "CustomerContact"("organizationId", "customerId");

-- CreateIndex
CREATE INDEX "ServiceLocation_organizationId_customerId_idx" ON "ServiceLocation"("organizationId", "customerId");

-- CreateIndex
CREATE INDEX "ServiceLocation_geog_idx" ON "ServiceLocation" USING GIST ("geog");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceLocation_organizationId_id_key" ON "ServiceLocation"("organizationId", "id");

-- CreateIndex
CREATE INDEX "CustomerNote_organizationId_customerId_createdAt_idx" ON "CustomerNote"("organizationId", "customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WasteCategory_organizationId_code_key" ON "WasteCategory"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "WasteCategory_organizationId_id_key" ON "WasteCategory"("organizationId", "id");

-- CreateIndex
CREATE INDEX "Contract_organizationId_status_endDate_idx" ON "Contract"("organizationId", "status", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_organizationId_reference_key" ON "Contract"("organizationId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_organizationId_id_key" ON "Contract"("organizationId", "id");

-- CreateIndex
CREATE INDEX "ContractServiceLine_organizationId_contractId_idx" ON "ContractServiceLine"("organizationId", "contractId");

-- CreateIndex
CREATE INDEX "CollectionRequest_organizationId_status_preferredDate_idx" ON "CollectionRequest"("organizationId", "status", "preferredDate");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionRequest_organizationId_number_key" ON "CollectionRequest"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionRequest_organizationId_id_key" ON "CollectionRequest"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Team_organizationId_name_key" ON "Team"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_organizationId_id_key" ON "Team"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_organizationId_plateNumber_key" ON "Vehicle"("organizationId", "plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_organizationId_id_key" ON "Vehicle"("organizationId", "id");

-- CreateIndex
CREATE INDEX "VehicleMaintenance_organizationId_vehicleId_performedAt_idx" ON "VehicleMaintenance"("organizationId", "vehicleId", "performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_collectionRequestId_key" ON "WorkOrder"("collectionRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_civicReportId_key" ON "WorkOrder"("civicReportId");

-- CreateIndex
CREATE INDEX "WorkOrder_organizationId_status_scheduledDate_idx" ON "WorkOrder"("organizationId", "status", "scheduledDate");

-- CreateIndex
CREATE INDEX "WorkOrder_organizationId_teamId_scheduledDate_idx" ON "WorkOrder"("organizationId", "teamId", "scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_organizationId_number_key" ON "WorkOrder"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_organizationId_id_key" ON "WorkOrder"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_organizationId_collectionRequestId_key" ON "WorkOrder"("organizationId", "collectionRequestId");

-- CreateIndex
CREATE INDEX "WeightTicket_organizationId_workOrderId_idx" ON "WeightTicket"("organizationId", "workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "EvidenceFile_storageKey_key" ON "EvidenceFile"("storageKey");

-- CreateIndex
CREATE INDEX "EvidenceFile_organizationId_workOrderId_idx" ON "EvidenceFile"("organizationId", "workOrderId");

-- CreateIndex
CREATE INDEX "EvidenceFile_civicReportId_idx" ON "EvidenceFile"("civicReportId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_status_dueDate_idx" ON "Invoice"("organizationId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_organizationId_number_key" ON "Invoice"("organizationId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_organizationId_id_key" ON "Invoice"("organizationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_workOrderId_key" ON "InvoiceLine"("workOrderId");

-- CreateIndex
CREATE INDEX "InvoiceLine_organizationId_invoiceId_idx" ON "InvoiceLine"("organizationId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_organizationId_workOrderId_key" ON "InvoiceLine"("organizationId", "workOrderId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_invoiceId_idx" ON "Payment"("organizationId", "invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_organizationId_idempotencyKey_key" ON "Payment"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_externalEventId_key" ON "PaymentWebhookEvent"("provider", "externalEventId");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_entityType_entityId_idx" ON "AuditEvent"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_createdAt_idx" ON "AuditEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_channel_sentAt_idx" ON "Notification"("channel", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "CivicReport_trackingCode_key" ON "CivicReport"("trackingCode");

-- CreateIndex
CREATE UNIQUE INDEX "CivicReport_clientSubmissionId_key" ON "CivicReport"("clientSubmissionId");

-- CreateIndex
CREATE INDEX "CivicReport_organizationId_status_createdAt_idx" ON "CivicReport"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "CivicReport_geog_idx" ON "CivicReport" USING GIST ("geog");

-- CreateIndex
CREATE INDEX "CivicReportEvent_reportId_createdAt_idx" ON "CivicReportEvent"("reportId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planCode_fkey" FOREIGN KEY ("planCode") REFERENCES "Plan"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceZone" ADD CONSTRAINT "ServiceZone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLocation" ADD CONSTRAINT "ServiceLocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLocation" ADD CONSTRAINT "ServiceLocation_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLocation" ADD CONSTRAINT "ServiceLocation_serviceZoneId_fkey" FOREIGN KEY ("serviceZoneId") REFERENCES "ServiceZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteCategory" ADD CONSTRAINT "WasteCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractServiceLine" ADD CONSTRAINT "ContractServiceLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractServiceLine" ADD CONSTRAINT "ContractServiceLine_organizationId_contractId_fkey" FOREIGN KEY ("organizationId", "contractId") REFERENCES "Contract"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractServiceLine" ADD CONSTRAINT "ContractServiceLine_organizationId_serviceLocationId_fkey" FOREIGN KEY ("organizationId", "serviceLocationId") REFERENCES "ServiceLocation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractServiceLine" ADD CONSTRAINT "ContractServiceLine_organizationId_wasteCategoryId_fkey" FOREIGN KEY ("organizationId", "wasteCategoryId") REFERENCES "WasteCategory"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_organizationId_serviceLocationId_fkey" FOREIGN KEY ("organizationId", "serviceLocationId") REFERENCES "ServiceLocation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_organizationId_contractId_fkey" FOREIGN KEY ("organizationId", "contractId") REFERENCES "Contract"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_organizationId_wasteCategoryId_fkey" FOREIGN KEY ("organizationId", "wasteCategoryId") REFERENCES "WasteCategory"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_organizationId_vehicleId_fkey" FOREIGN KEY ("organizationId", "vehicleId") REFERENCES "Vehicle"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_collectionRequestId_fkey" FOREIGN KEY ("organizationId", "collectionRequestId") REFERENCES "CollectionRequest"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_civicReportId_fkey" FOREIGN KEY ("civicReportId") REFERENCES "CivicReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_serviceLocationId_fkey" FOREIGN KEY ("organizationId", "serviceLocationId") REFERENCES "ServiceLocation"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_contractId_fkey" FOREIGN KEY ("organizationId", "contractId") REFERENCES "Contract"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_wasteCategoryId_fkey" FOREIGN KEY ("organizationId", "wasteCategoryId") REFERENCES "WasteCategory"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_teamId_fkey" FOREIGN KEY ("organizationId", "teamId") REFERENCES "Team"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_organizationId_vehicleId_fkey" FOREIGN KEY ("organizationId", "vehicleId") REFERENCES "Vehicle"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightTicket" ADD CONSTRAINT "WeightTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightTicket" ADD CONSTRAINT "WeightTicket_organizationId_workOrderId_fkey" FOREIGN KEY ("organizationId", "workOrderId") REFERENCES "WorkOrder"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFile" ADD CONSTRAINT "EvidenceFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFile" ADD CONSTRAINT "EvidenceFile_organizationId_workOrderId_fkey" FOREIGN KEY ("organizationId", "workOrderId") REFERENCES "WorkOrder"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFile" ADD CONSTRAINT "EvidenceFile_civicReportId_fkey" FOREIGN KEY ("civicReportId") REFERENCES "CivicReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceFile" ADD CONSTRAINT "EvidenceFile_organizationId_contractId_fkey" FOREIGN KEY ("organizationId", "contractId") REFERENCES "Contract"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_customerId_fkey" FOREIGN KEY ("organizationId", "customerId") REFERENCES "Customer"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_contractId_fkey" FOREIGN KEY ("organizationId", "contractId") REFERENCES "Contract"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_invoiceId_fkey" FOREIGN KEY ("organizationId", "invoiceId") REFERENCES "Invoice"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_organizationId_workOrderId_fkey" FOREIGN KEY ("organizationId", "workOrderId") REFERENCES "WorkOrder"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_invoiceId_fkey" FOREIGN KEY ("organizationId", "invoiceId") REFERENCES "Invoice"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Counter" ADD CONSTRAINT "Counter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicReport" ADD CONSTRAINT "CivicReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicReport" ADD CONSTRAINT "CivicReport_serviceZoneId_fkey" FOREIGN KEY ("serviceZoneId") REFERENCES "ServiceZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicReport" ADD CONSTRAINT "CivicReport_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "CivicReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CivicReportEvent" ADD CONSTRAINT "CivicReportEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CivicReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── NEXVO hand-written additions ───────────────────────────────────────────

-- Keep PostGIS geography columns in sync with lat/lng decimals.
CREATE OR REPLACE FUNCTION nexvo_sync_geog() RETURNS trigger AS $$
BEGIN
  IF NEW."latitude" IS NULL OR NEW."longitude" IS NULL THEN
    NEW."geog" := NULL;
  ELSE
    NEW."geog" := ST_SetSRID(ST_MakePoint(NEW."longitude"::float8, NEW."latitude"::float8), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ServiceLocation_geog_sync" BEFORE INSERT OR UPDATE OF "latitude", "longitude"
  ON "ServiceLocation" FOR EACH ROW EXECUTE FUNCTION nexvo_sync_geog();
CREATE TRIGGER "CivicReport_geog_sync" BEFORE INSERT OR UPDATE OF "latitude", "longitude"
  ON "CivicReport" FOR EACH ROW EXECUTE FUNCTION nexvo_sync_geog();

-- Defence-in-depth invariants (the domain layer enforces these first).
ALTER TABLE "ServiceLocation" ADD CONSTRAINT "ServiceLocation_lat_range" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90);
ALTER TABLE "ServiceLocation" ADD CONSTRAINT "ServiceLocation_lng_range" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);
ALTER TABLE "CivicReport" ADD CONSTRAINT "CivicReport_lat_range" CHECK ("latitude" BETWEEN -90 AND 90);
ALTER TABLE "CivicReport" ADD CONSTRAINT "CivicReport_lng_range" CHECK ("longitude" BETWEEN -180 AND 180);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paid_not_above_total" CHECK ("amountPaid" >= 0 AND "amountPaid" <= "total");
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_price_non_negative" CHECK ("unitPrice" >= 0);
ALTER TABLE "WeightTicket" ADD CONSTRAINT "WeightTicket_weights_valid" CHECK ("tareKg" >= 0 AND "grossKg" >= "tareKg" AND "netKg" = "grossKg" - "tareKg");
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_kind_links" CHECK (
  ("kind" = 'COLLECTION' AND "customerId" IS NOT NULL AND "serviceLocationId" IS NOT NULL)
  OR ("kind" = 'CIVIC_INTERVENTION' AND "civicReportId" IS NOT NULL)
);
