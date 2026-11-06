import { z } from "zod";
import { prisma } from "../db";
import { hasPermission, requirePermission, type OrgContext } from "../context";
import { NotFoundError } from "../domain/errors";
import { audit } from "../audit";
import { nextNumber } from "../counters";
import { enforcePlanLimit } from "./accounts";
import { algeriaLatitude, algeriaLongitude, email, optionalPhone, optionalTaxId, optionalText, parse, requiredText } from "../validation";

export const customerSchema = z.object({
  name: requiredText(160),
  kind: z.enum(["BUSINESS", "INSTITUTION", "RESIDENTIAL"]).default("BUSINESS"),
  taxId: optionalTaxId,
  email: z.preprocess((v) => (v === "" ? undefined : v), email.optional()),
  phone: optionalPhone,
  billingAddress: optionalText(300),
  serviceConditions: optionalText(2000),
});

export async function listCustomers(ctx: OrgContext, opts: { q?: string; status?: "ACTIVE" | "INACTIVE" } = {}) {
  requirePermission(ctx, "customers.read");
  const q = opts.q?.trim().slice(0, 100);
  return prisma.customer.findMany({
    where: {
      organizationId: ctx.org.id,
      status: opts.status,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { _count: { select: { locations: true, contracts: { where: { status: "ACTIVE" } } } } },
    orderBy: { name: "asc" },
    take: 200,
  });
}

export async function getCustomer(ctx: OrgContext, customerId: string) {
  requirePermission(ctx, "customers.read");
  const c = await prisma.customer.findFirst({
    where: { id: customerId, organizationId: ctx.org.id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      locations: { orderBy: { label: "asc" } },
      notes: { orderBy: { createdAt: "desc" }, take: 50 },
      contracts: { orderBy: { startDate: "desc" } },
      workOrders: { orderBy: { scheduledDate: "desc" }, take: 10 },
      // Amounts are finance data: only for roles that may read invoices (dispatchers see the customer, not its billing).
      invoices: hasPermission(ctx, "invoices.read") ? { orderBy: { createdAt: "desc" }, take: 10 } : { where: { id: "__none__" } },
    },
  });
  if (!c) throw new NotFoundError("Customer");
  const authorIds = [...new Set(c.notes.map((n) => n.authorId))];
  const authors = await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true } });
  return { ...c, noteAuthors: Object.fromEntries(authors.map((a) => [a.id, a.name])) };
}

export async function createCustomer(ctx: OrgContext, input: unknown) {
  requirePermission(ctx, "customers.write");
  const data = parse(customerSchema, input);
  await enforcePlanLimit(ctx, "customers");
  return prisma.$transaction(async (tx) => {
    const code = await nextNumber(tx, ctx.org.id, "customer", "CUS", 4);
    const customer = await tx.customer.create({ data: { ...data, code, organizationId: ctx.org.id } });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "customer.created", entityType: "Customer", entityId: customer.id });
    return customer;
  });
}

export async function updateCustomer(ctx: OrgContext, customerId: string, input: unknown) {
  requirePermission(ctx, "customers.write");
  const data = parse(customerSchema.extend({ status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE") }), input);
  return prisma.$transaction(async (tx) => {
    const r = await tx.customer.updateMany({ where: { id: customerId, organizationId: ctx.org.id }, data });
    if (r.count === 0) throw new NotFoundError("Customer");
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "customer.updated", entityType: "Customer", entityId: customerId });
  });
}

async function assertCustomer(ctx: OrgContext, customerId: string) {
  const c = await prisma.customer.findFirst({ where: { id: customerId, organizationId: ctx.org.id }, select: { id: true } });
  if (!c) throw new NotFoundError("Customer");
}

const contactSchema = z.object({
  name: requiredText(120),
  jobTitle: optionalText(120),
  email: z.preprocess((v) => (v === "" ? undefined : v), email.optional()),
  phone: optionalPhone,
  isPrimary: z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean()),
});

export async function addContact(ctx: OrgContext, customerId: string, input: unknown) {
  requirePermission(ctx, "customers.write");
  const data = parse(contactSchema, input);
  await assertCustomer(ctx, customerId);
  return prisma.$transaction(async (tx) => {
    if (data.isPrimary) {
      await tx.customerContact.updateMany({ where: { organizationId: ctx.org.id, customerId }, data: { isPrimary: false } });
    }
    const c = await tx.customerContact.create({ data: { ...data, organizationId: ctx.org.id, customerId } });
    // No contact details in the audit entry (personal data stays in its own table).
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "customer.contact_added", entityType: "Customer", entityId: customerId, data: { contactId: c.id } });
    return c;
  });
}

export const locationSchema = z
  .object({
    label: requiredText(120),
    addressLine: requiredText(300),
    commune: optionalText(80),
    wilaya: optionalText(80),
    latitude: z.preprocess((v) => (v === "" || v == null ? undefined : v), algeriaLatitude.optional()),
    longitude: z.preprocess((v) => (v === "" || v == null ? undefined : v), algeriaLongitude.optional()),
    accessNotes: optionalText(1000),
  })
  .refine((d) => (d.latitude === undefined) === (d.longitude === undefined), { path: ["longitude"], message: "both" });

export async function addServiceLocation(ctx: OrgContext, customerId: string, input: unknown) {
  requirePermission(ctx, "customers.write");
  const data = parse(locationSchema, input);
  await assertCustomer(ctx, customerId);
  return prisma.$transaction(async (tx) => {
    const loc = await tx.serviceLocation.create({
      data: {
        ...data,
        latitude: data.latitude?.toFixed(6),
        longitude: data.longitude?.toFixed(6),
        organizationId: ctx.org.id,
        customerId,
      },
    });
    await audit(tx, { organizationId: ctx.org.id, actorUserId: ctx.userId, action: "location.created", entityType: "ServiceLocation", entityId: loc.id });
    return loc;
  });
}

export async function addCustomerNote(ctx: OrgContext, customerId: string, input: unknown) {
  requirePermission(ctx, "customers.write");
  const { body } = parse(z.object({ body: requiredText(4000) }), input);
  await assertCustomer(ctx, customerId);
  return prisma.customerNote.create({ data: { organizationId: ctx.org.id, customerId, authorId: ctx.userId, body } });
}

/** Lightweight lookups for forms. */
export async function customerOptions(ctx: OrgContext) {
  requirePermission(ctx, "customers.read");
  return prisma.customer.findMany({
    where: { organizationId: ctx.org.id, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      code: true,
      locations: { where: { active: true }, select: { id: true, label: true } },
      contracts: { where: { status: "ACTIVE" }, select: { id: true, reference: true, title: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function wasteCategoryOptions(ctx: OrgContext) {
  return prisma.wasteCategory.findMany({
    where: { organizationId: ctx.org.id, active: true },
    orderBy: { code: "asc" },
  });
}
