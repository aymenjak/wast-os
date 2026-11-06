import { beforeAll, describe, expect, it } from "vitest";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createCustomer, getCustomer } from "@/server/services/customers";
import type { OrgContext } from "@/server/context";

/** Regressions for defects found in the full-system review (2026-11-06). */
let owner: OrgContext, dispatcher: OrgContext, finance: OrgContext;
let customerId: string;

beforeAll(async () => {
  await resetDb();
  owner = (await newOrg("SERVICE_PROVIDER", "Review")).ctx;
  dispatcher = await addMember(owner, "DISPATCHER");
  finance = await addMember(owner, "FINANCE");
  customerId = (await createCustomer(owner, { name: "Client facturé (synthetic)" })).id;
  await prisma.invoice.create({
    data: { organizationId: owner.org.id, customerId, status: "DRAFT", currency: "DZD", subtotal: "1000", taxTotal: "190", total: "1190", createdById: owner.userId },
  });
});

describe("customer page and billing data", () => {
  it("a dispatcher sees the customer but not its invoices or amounts (no invoices.read)", async () => {
    expect((await getCustomer(dispatcher, customerId)).invoices).toEqual([]);
  });
  it("finance and the owner still see them", async () => {
    expect((await getCustomer(finance, customerId)).invoices).toHaveLength(1);
    expect((await getCustomer(owner, customerId)).invoices).toHaveLength(1);
  });
});

describe("citizen personal data is encrypted at rest", () => {
  it("name and contact are stored as AES-GCM ciphertext, shown in clear only to reviewers and used for notifications", async () => {
    const { randomUUID } = await import("node:crypto");
    const { submitCivicReport, getCivicReport, reviewCivicReport } = await import("@/server/services/civic");
    const m = await newOrg("MUNICIPALITY", "APC Chiffrement");
    const r = await submitCivicReport({
      municipality: m.org.slug, category: "ILLEGAL_DUMPING", description: "Dépôt sauvage près du marché (test)",
      latitude: "36.75", longitude: "3.04", reporterName: "Citoyen Test", reporterContact: "citoyen@example.test", clientSubmissionId: randomUUID(),
    });
    const id = "id" in r ? (r as { id: string }).id : (await prisma.civicReport.findFirstOrThrow({ where: { organizationId: m.org.id } })).id;
    const raw = await prisma.civicReport.findUniqueOrThrow({ where: { id }, select: { reporterName: true, reporterContact: true } });
    expect(raw.reporterName).toMatch(/^v1\./);
    expect(raw.reporterContact).toMatch(/^v1\./);
    expect(JSON.stringify(raw)).not.toContain("citoyen@example.test");
    const seen = await getCivicReport(m.ctx, id);
    expect([seen.reporterName, seen.reporterContact]).toEqual(["Citoyen Test", "citoyen@example.test"]);
    await reviewCivicReport(m.ctx, id, { to: "UNDER_REVIEW" });
    const mail = await prisma.notification.findFirst({ where: { organizationId: m.org.id, channel: "EMAIL" }, orderBy: { createdAt: "desc" } });
    expect(mail?.recipient).toBe("citoyen@example.test");
  });

  it("values written before encryption are still readable (migration script converts them later)", async () => {
    const { decryptPII, encryptPII } = await import("@/server/crypto");
    expect(decryptPII("ancien@example.test")).toBe("ancien@example.test");
    expect(decryptPII(encryptPII("x@example.test"))).toBe("x@example.test");
    expect(decryptPII("v1.broken.value.here")).toBeNull();
    expect(encryptPII("")).toBeNull();
  });
});
