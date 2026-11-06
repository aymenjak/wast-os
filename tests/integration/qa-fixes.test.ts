import { beforeAll, describe, expect, it } from "vitest";
import { newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { addContact, addServiceLocation, createCustomer } from "@/server/services/customers";
import { billableWorkOrders, createDraftInvoice } from "@/server/services/invoices";
import { DomainError } from "@/server/domain/errors";
import { registerOrganization } from "@/server/services/accounts";
import type { OrgContext } from "@/server/context";

/** UI review fixes: customer data checks (NIF, phone, site inside Algeria), sign-up rules, billing a one-off job (no contract price). */
let a: OrgContext, b: OrgContext;

async function fields(p: Promise<unknown>) {
  const e = await p.catch((x: unknown) => x);
  expect(e).toBeInstanceOf(DomainError);
  return (e as DomainError).details?.fields as Record<string, string>;
}

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "Revue A")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "Revue B")).ctx;
});

describe("customer data checks", () => {
  it("refuses a malformed NIF and phone, naming the field", async () => {
    expect(await fields(createCustomer(a, { name: "X (synthetic)", taxId: "abc", phone: "12" }))).toEqual({ taxId: "taxId", phone: "phone" });
  });

  it("accepts spaced Algerian and international formats, and stores the NIF digits only", async () => {
    const c = await createCustomer(a, { name: "Format OK (synthetic)", taxId: "000 123 456 789 012", phone: "0550 12 34 56" });
    expect(c.taxId).toBe("000123456789012");
    await expect(addContact(a, c.id, { name: "Contact (synthetic)", phone: "+33 6 12 34 56 78" })).resolves.toBeTruthy();
    expect(await fields(addContact(a, c.id, { name: "Contact (synthetic)", phone: "0000" }))).toEqual({ phone: "phone" });
  });

  it("refuses a service site outside Algeria (a site abroad, or swapped coordinates)", async () => {
    const c = await createCustomer(a, { name: "Site check (synthetic)" });
    expect(await fields(addServiceLocation(a, c.id, { label: "Paris", addressLine: "Rue", latitude: "48.85", longitude: "2.35" }))).toEqual({ latitude: "outsideAlgeria" });
    expect(await fields(addServiceLocation(a, c.id, { label: "Inversé", addressLine: "Rue", latitude: "-0.64", longitude: "35.70" }))).toMatchObject({ latitude: "outsideAlgeria", longitude: "outsideAlgeria" });
    await expect(addServiceLocation(a, c.id, { label: "Oran", addressLine: "Rue", latitude: "35.70", longitude: "-0.64" })).resolves.toBeTruthy();
  });
});

describe("sign-up", () => {
  const base = { organizationName: "Inscription (synthetic)", name: "Test", password: "correct-horse-battery", acceptPrivacy: "on" };

  it("refuses an easy password and a missing privacy consent, naming the field", async () => {
    expect(await fields(registerOrganization({ ...base, email: `weak-${Date.now()}@example.test`, password: "aaaaaaaaaa" }))).toEqual({ password: "weakPassword" });
    expect(await fields(registerOrganization({ ...base, email: `stock-${Date.now()}@example.test`, password: "1234567890" }))).toEqual({ password: "weakPassword" });
    expect(await fields(registerOrganization({ ...base, email: `noconsent-${Date.now()}@example.test`, acceptPrivacy: undefined }))).toEqual({ acceptPrivacy: "privacyConsent" });
  });

  it("accepts a varied password with the box ticked", async () => {
    await expect(registerOrganization({ ...base, email: `ok-${Date.now()}@example.test` })).resolves.toMatchObject({ org: expect.anything() });
  });
});

describe("billing a one-off job", () => {
  let customerId: string, workOrderId: string;

  beforeAll(async () => {
    customerId = (await createCustomer(a, { name: "Ponctuel (synthetic)" })).id;
    const loc = (await addServiceLocation(a, customerId, { label: "Dépôt", addressLine: "Rue 1", latitude: "35.70", longitude: "-0.64" })).id;
    workOrderId = (await prisma.workOrder.create({
      data: { organizationId: a.org.id, number: "WO-P1", kind: "COLLECTION", status: "COMPLETED", customerId, serviceLocationId: loc, scheduledDate: new Date("2026-11-05T00:00:00Z"), createdById: a.userId },
    })).id;
  });

  it("lists it as billable, flagged as needing a price", async () => {
    expect((await billableWorkOrders(a, customerId)).map((w) => [w.number, w.needsPrice])).toEqual([["WO-P1", true]]);
  });

  it("still refuses it without a price, and refuses a zero price", async () => {
    await expect(createDraftInvoice(a, { customerId, workOrderIds: [workOrderId] })).rejects.toThrow("errors.invoice.noContractPrice");
    await expect(createDraftInvoice(a, { customerId, workOrderIds: [workOrderId], prices: { [workOrderId]: "0" } })).rejects.toThrow("errors.validation");
  });

  it("bills it at the typed price, linked to the job, so it is no longer billable", async () => {
    const inv = await createDraftInvoice(a, { customerId, workOrderIds: [workOrderId], prices: { [workOrderId]: "4500,00" } });
    const line = await prisma.invoiceLine.findFirstOrThrow({ where: { invoiceId: inv.id } });
    expect([line.workOrderId, String(line.unitPrice), String(line.quantity)]).toEqual([workOrderId, "4500", "1"]);
    expect(line.description).toContain("WO-P1");
    expect(await billableWorkOrders(a, customerId)).toEqual([]);
  });

  it("does not let another organization bill it", async () => {
    await expect(createDraftInvoice(b, { customerId, workOrderIds: [workOrderId], prices: { [workOrderId]: "100" } })).rejects.toThrow("errors.notFound");
  });
});
