import type { OrganizationKind, OrgRole } from "@/lib/generated/prisma/enums";

export const PERMISSIONS = [
  "customers.read",
  "customers.write",
  "contracts.read",
  "contracts.write",
  "requests.read",
  "requests.write",
  "requests.validate",
  "workorders.read",
  "workorders.dispatch",
  "workorders.execute",
  "fleet.read",
  "fleet.write",
  "invoices.read",
  "invoices.write",
  "payments.record",
  "reports.read",
  "team.manage",
  "settings.manage",
  "civic.read",
  "civic.review",
  "portal.access",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL_STAFF: Permission[] = PERMISSIONS.filter((p) => p !== "portal.access");

const ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  OWNER: ALL_STAFF,
  ADMIN: ALL_STAFF,
  DISPATCHER: [
    "customers.read",
    "customers.write",
    "contracts.read",
    "requests.read",
    "requests.write",
    "requests.validate",
    "workorders.read",
    "workorders.dispatch",
    "workorders.execute",
    "fleet.read",
    "fleet.write",
    "reports.read",
    "civic.read",
  ],
  FIELD_WORKER: ["workorders.read", "workorders.execute"],
  FINANCE: [
    "customers.read",
    "contracts.read",
    "requests.read",
    "workorders.read",
    "invoices.read",
    "invoices.write",
    "payments.record",
    "reports.read",
  ],
  VIEWER: [
    "customers.read",
    "contracts.read",
    "requests.read",
    "workorders.read",
    "fleet.read",
    "invoices.read",
    "reports.read",
    "civic.read",
  ],
  CIVIC_REVIEWER: ["civic.read", "civic.review", "workorders.read", "workorders.dispatch", "fleet.read"],
  CUSTOMER_PORTAL: ["portal.access"],
};

/** Permissions that only make sense for one kind of organization. */
const BUSINESS_ONLY: ReadonlySet<Permission> = new Set([
  "customers.read",
  "customers.write",
  "contracts.read",
  "contracts.write",
  "requests.read",
  "requests.write",
  "requests.validate",
  "invoices.read",
  "invoices.write",
  "payments.record",
  "portal.access",
]);
const CIVIC_ONLY: ReadonlySet<Permission> = new Set(["civic.read", "civic.review"]);

export function permissionsFor(role: OrgRole, kind: OrganizationKind): Set<Permission> {
  return new Set(
    ROLE_PERMISSIONS[role].filter((p) =>
      kind === "MUNICIPALITY" ? !BUSINESS_ONLY.has(p) : !CIVIC_ONLY.has(p),
    ),
  );
}

export function can(role: OrgRole, kind: OrganizationKind, permission: Permission): boolean {
  return permissionsFor(role, kind).has(permission);
}

/** Roles a given role may grant when inviting. Owners are never granted by invitation. */
export function assignableRoles(kind: OrganizationKind): OrgRole[] {
  return kind === "MUNICIPALITY"
    ? ["ADMIN", "DISPATCHER", "FIELD_WORKER", "CIVIC_REVIEWER", "VIEWER"]
    : ["ADMIN", "DISPATCHER", "FIELD_WORKER", "FINANCE", "VIEWER", "CUSTOMER_PORTAL"];
}
