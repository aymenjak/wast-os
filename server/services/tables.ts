import { prisma } from "../db";
import { hasPermission, requirePermission, type OrgContext } from "../context";
import { ForbiddenError } from "../domain/errors";
import { containsInsensitive, pageOf, type TableState } from "../table";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ContainerStatus, CustomerStatus, InvoiceStatus, WorkOrderStatus } from "@/lib/generated/prisma/enums";

/** Customers of this org whose name matches accent- and case-insensitively ("hotel" finds "Hôtel"). */
async function customerIdsByName(orgId: string, q: string) {
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Customer" WHERE "organizationId" = ${orgId} AND nexvo_fold("name") LIKE nexvo_fold(${pattern}) LIMIT 1000`;
  return rows.map((r) => r.id);
}

/** Prisma allows `nulls` ordering only on nullable columns. */
function order<S extends string>(sort: S, dir: "asc" | "desc", nullable: readonly string[]) {
  return { [sort]: nullable.includes(sort) ? { sort: dir, nulls: "last" as const } : dir };
}

export const CUSTOMER_SORTS = ["name", "code", "createdAt"] as const;
export async function customersTable(ctx: OrgContext, s: TableState<(typeof CUSTOMER_SORTS)[number]>) {
  requirePermission(ctx, "customers.read");
  const c = s.q ? containsInsensitive(s.q) : null;
  const ids = s.q ? await customerIdsByName(ctx.org.id, s.q) : [];
  const where: Prisma.CustomerWhereInput = {
    organizationId: ctx.org.id,
    ...(s.filter === "ACTIVE" || s.filter === "INACTIVE" ? { status: s.filter as CustomerStatus } : {}),
    ...(c ? { OR: [{ id: { in: ids } }, { code: c }, { taxId: c }, { email: c }, { phone: c }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where, orderBy: { [s.sort]: s.dir }, skip: (s.page - 1) * s.pageSize, take: s.pageSize,
      include: { _count: { select: { locations: true, contracts: { where: { status: "ACTIVE" } } } } },
    }),
    prisma.customer.count({ where }),
  ]);
  return pageOf(rows, total, s);
}

export const WORK_ORDER_SORTS = ["scheduledDate", "number", "status", "priority"] as const;
export async function workOrdersTable(ctx: OrgContext, s: TableState<(typeof WORK_ORDER_SORTS)[number]>) {
  if (!hasPermission(ctx, "workorders.read")) throw new ForbiddenError("workorders.read");
  const c = s.q ? containsInsensitive(s.q) : null;
  const ids = s.q ? await customerIdsByName(ctx.org.id, s.q) : [];
  const statuses = ["PLANNED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED", "DISPUTED"];
  const where: Prisma.WorkOrderWhereInput = {
    organizationId: ctx.org.id,
    ...(s.filter === "OPEN" ? { status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS", "DISPUTED"] } } : s.filter && statuses.includes(s.filter) ? { status: s.filter as WorkOrderStatus } : {}),
    ...(c ? { OR: [{ number: c }, { customerId: { in: ids } }, { serviceLocation: { label: c } }, { team: { name: c } }, { vehicle: { plateNumber: c } }] } : {}),
  };
  if (ctx.role === "FIELD_WORKER") {
    const teams = await prisma.teamMember.findMany({ where: { membershipId: ctx.membershipId }, select: { teamId: true } });
    where.teamId = { in: teams.map((t) => t.teamId) };
  }
  const [rows, total] = await Promise.all([
    prisma.workOrder.findMany({
      where, orderBy: [{ [s.sort]: s.dir }, { number: "asc" }], skip: (s.page - 1) * s.pageSize, take: s.pageSize,
      include: {
        customer: { select: { name: true } }, serviceLocation: { select: { label: true, addressLine: true } }, team: { select: { name: true } },
        vehicle: { select: { plateNumber: true } }, civicReport: { select: { trackingCode: true, addressHint: true } }, invoiceLine: { select: { invoiceId: true } },
      },
    }),
    prisma.workOrder.count({ where }),
  ]);
  return pageOf(rows, total, s);
}

export const INVOICE_SORTS = ["createdAt", "issueDate", "dueDate", "total", "number"] as const;
export async function invoicesTable(ctx: OrgContext, s: TableState<(typeof INVOICE_SORTS)[number]>) {
  requirePermission(ctx, "invoices.read");
  const c = s.q ? containsInsensitive(s.q) : null;
  const ids = s.q ? await customerIdsByName(ctx.org.id, s.q) : [];
  const statuses = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID"];
  const where: Prisma.InvoiceWhereInput = {
    organizationId: ctx.org.id,
    ...(s.filter === "OPEN" ? { status: { in: ["ISSUED", "PARTIALLY_PAID"] } } : s.filter && statuses.includes(s.filter) ? { status: s.filter as InvoiceStatus } : {}),
    ...(c ? { OR: [{ number: c }, { customerId: { in: ids } }, { billToName: c }] } : {}),
  };
  const [rows, total, sums] = await Promise.all([
    prisma.invoice.findMany({ where, orderBy: [order(s.sort, s.dir, ["issueDate", "dueDate", "number"]), { createdAt: "desc" }], skip: (s.page - 1) * s.pageSize, take: s.pageSize, include: { customer: { select: { name: true } } } }),
    prisma.invoice.count({ where }),
    prisma.invoice.aggregate({ where: { ...where, status: { notIn: ["DRAFT", "VOID"] } }, _sum: { total: true, amountPaid: true } }),
  ]);
  return { ...pageOf(rows, total, s), sums: { total: Number(sums._sum.total ?? 0), paid: Number(sums._sum.amountPaid ?? 0) } };
}

export const CONTAINER_SORTS = ["code", "type", "status", "placedAt"] as const;
export async function containersTable(ctx: OrgContext, s: TableState<(typeof CONTAINER_SORTS)[number]>) {
  requirePermission(ctx, "fleet.read");
  const c = s.q ? containsInsensitive(s.q) : null;
  const ids = s.q ? await customerIdsByName(ctx.org.id, s.q) : [];
  const statuses = ["IN_YARD", "AT_CUSTOMER", "MAINTENANCE", "RETIRED"];
  const where: Prisma.ContainerWhereInput = {
    organizationId: ctx.org.id,
    ...(s.filter && statuses.includes(s.filter) ? { status: s.filter as ContainerStatus } : {}),
    ...(c ? { OR: [{ code: c }, { serviceLocation: { label: c } }, { serviceLocation: { customerId: { in: ids } } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.container.findMany({
      where, orderBy: [order(s.sort, s.dir, ["placedAt"]), { code: "asc" }], skip: (s.page - 1) * s.pageSize, take: s.pageSize,
      include: { serviceLocation: { select: { label: true, customer: { select: { id: true, name: true } } } } },
    }),
    prisma.container.count({ where }),
  ]);
  return pageOf(rows, total, s);
}
