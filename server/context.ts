import type { OrganizationKind, OrgRole } from "@/lib/generated/prisma/enums";
import { permissionsFor, type Permission } from "./domain/permissions";
import { ForbiddenError } from "./domain/errors";

/** Everything a service needs to authorize and scope a call. Built server-side only. */
export type OrgContext = {
  userId: string;
  userName: string;
  membershipId: string;
  role: OrgRole;
  /** Set for CUSTOMER_PORTAL members. */
  customerId: string | null;
  org: {
    id: string;
    slug: string;
    name: string;
    kind: OrganizationKind;
    timezone: string;
    currency: string;
    defaultTaxRateBps: number;
    civicSlaHours: number;
  };
  permissions: ReadonlySet<Permission>;
};

export function buildContext(input: Omit<OrgContext, "permissions">): OrgContext {
  return { ...input, permissions: permissionsFor(input.role, input.org.kind) };
}

export function requirePermission(ctx: OrgContext, permission: Permission): void {
  if (!ctx.permissions.has(permission)) throw new ForbiddenError(permission);
}

export function hasPermission(ctx: OrgContext, permission: Permission): boolean {
  return ctx.permissions.has(permission);
}
