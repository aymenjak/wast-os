/**
 * Development seed. ALL DATA IS SYNTHETIC — no real companies, people or contracts.
 * Plan prices are pricing hypotheses (see PRICING-ASSUMPTIONS.md), not validated prices.
 * Run: npm run db:seed   (refuses to run when NODE_ENV=production)
 */
import "dotenv/config";
import { prisma } from "../server/db";
import { registerOrganization, loadContext, inviteMember, acceptInvitation } from "../server/services/accounts";
import { createCustomer, addServiceLocation, addContact } from "../server/services/customers";
import { createContract, setContractStatus } from "../server/services/contracts";
import { createRequest, validateRequest } from "../server/services/requests";
import { createVehicle, createTeam, addTeamMember } from "../server/services/fleet";
import { assignWorkOrder } from "../server/services/work-orders";
import { submitCivicReport } from "../server/services/civic";
import { createContainer, moveContainer } from "../server/services/containers";
import { generateRecurringWorkOrders } from "../server/services/schedules";
import { createDraftInvoice, issueInvoice, recordPayment } from "../server/services/invoices";
import { randomUUID } from "node:crypto";

const PASSWORD = "nexvo-demo-2026";

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");

  for (const p of [
    { code: "STARTER", name: "Starter", priceMonthly: "9900", priceYearly: "99000", maxUsers: 5, maxVehicles: 3, maxCustomers: 50, customerPortal: false, advancedReports: false, sortOrder: 1 },
    { code: "PRO", name: "Professional", priceMonthly: "24900", priceYearly: "249000", maxUsers: 20, maxVehicles: 15, maxCustomers: 400, customerPortal: true, advancedReports: true, sortOrder: 2 },
    { code: "ENTERPRISE", name: "Enterprise", priceMonthly: "59900", priceYearly: "599000", maxUsers: -1, maxVehicles: -1, maxCustomers: -1, customerPortal: true, advancedReports: true, sortOrder: 3 },
  ]) {
    await prisma.plan.upsert({ where: { code: p.code }, create: p, update: p });
  }

  if (await prisma.user.findUnique({ where: { email: "owner@demo-collecte.test" } })) {
    console.log("Seed data already present — plans refreshed, nothing else changed.");
    return;
  }

  // Service provider (synthetic)
  const reg = await registerOrganization({ organizationName: "Démo Collecte SARL", kind: "SERVICE_PROVIDER", wilaya: "Oran", name: "Samir Démo", email: "owner@demo-collecte.test", password: PASSWORD, locale: "fr" });
  await prisma.subscription.update({ where: { organizationId: reg.org.id }, data: { planCode: "PRO" } });
  await prisma.organization.update({ where: { id: reg.org.id }, data: { legalName: "Démo Collecte SARL", taxId: "000000000000000", address: "Zone d'activités, Es Senia, Oran" } });
  const owner = (await loadContext(reg.user.id, reg.org.id))!;

  const member = async (email: string, name: string, role: "DISPATCHER" | "FIELD_WORKER" | "FINANCE") => {
    const { token } = await inviteMember(owner, { email, role });
    const r = await acceptInvitation({ token, name, password: PASSWORD });
    return (await loadContext(r.user.id, reg.org.id))!;
  };
  const dispatcher = await member("dispatch@demo-collecte.test", "Nadia Démo", "DISPATCHER");
  const driver = await member("driver@demo-collecte.test", "Yacine Démo", "FIELD_WORKER");
  await member("finance@demo-collecte.test", "Leila Démo", "FINANCE");

  const team = await createTeam(owner, { name: "Équipe Es Senia" });
  await addTeamMember(owner, team.id, driver.membershipId);
  const v1 = await createVehicle(owner, { plateNumber: "00001-120-31", label: "Benne tasseuse 1", type: "COMPACTOR", capacityKg: "8000" });
  await createVehicle(owner, { plateNumber: "00002-119-31", label: "Porte-caisson", type: "SKIP_LOADER", capacityKg: "12000" });

  const msw = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: reg.org.id, code: "MSW" } });
  const card = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: reg.org.id, code: "CARDBOARD" } });
  const today = new Date().toISOString().slice(0, 10);

  const customers = [
    { name: "Clinique Exemple Oran", loc: ["Bâtiment principal", "35.6970", "-0.6330"] },
    { name: "Hôtel Démonstration", loc: ["Cuisine centrale", "35.7058", "-0.6459"] },
    { name: "Supérette Test Bir El Djir", loc: ["Magasin", "35.7210", "-0.5500"] },
  ];
  for (const [i, c] of customers.entries()) {
    const cust = await createCustomer(dispatcher, { name: c.name, kind: "BUSINESS" });
    await addContact(dispatcher, cust.id, { name: `Contact ${i + 1}`, phone: "0550000000", isPrimary: "on" });
    const loc = await addServiceLocation(dispatcher, cust.id, { label: c.loc[0], addressLine: "Adresse fictive", wilaya: "Oran", latitude: c.loc[1], longitude: c.loc[2] });
    const contract = await createContract(owner, {
      customerId: cust.id, title: "Collecte régulière", startDate: today,
      lines: [
        { serviceLocationId: loc.id, wasteCategoryId: msw.id, frequency: "WEEKLY", weekdays: [7, 3], billingUnit: i === 0 ? "PER_TONNE" : "PER_COLLECTION", unitPrice: i === 0 ? "4500" : "3500" },
        { serviceLocationId: loc.id, wasteCategoryId: card.id, frequency: "MONTHLY", billingUnit: "PER_COLLECTION", unitPrice: "2000" },
      ],
    });
    await setContractStatus(owner, contract.id, "ACTIVE");
    const req = await createRequest(dispatcher, { customerId: cust.id, serviceLocationId: loc.id, contractId: contract.id, wasteCategoryId: msw.id, preferredDate: today, estimatedQuantity: "2" });
    if (i < 2) {
      const wo = await validateRequest(dispatcher, req.id);
      await assignWorkOrder(dispatcher, wo.id, { teamId: team.id, vehicleId: v1.id, scheduledDate: today });
    }
  }

  // Containers (synthetic): some in the yard, some placed at customer sites
  const locs = await prisma.serviceLocation.findMany({ where: { organizationId: reg.org.id }, orderBy: { createdAt: "asc" } });
  const specs = [["SKP-001", "SKIP_10M3"], ["SKP-002", "SKIP_10M3"], ["BAC-660-01", "BIN_660L"], ["BAC-660-02", "BIN_660L"], ["CSN-30-01", "ROLLOFF_30M3"], ["BAC-1100-01", "BIN_1100L"]] as const;
  for (const [i, [code, type]] of specs.entries()) {
    const c = await createContainer(owner, { code, type });
    if (i < 3 && locs[i]) await moveContainer(owner, { containerId: c.id, action: "deliver", serviceLocationId: locs[i]!.id });
  }
  // 14 days of synthetic history so dashboards are not empty in demos (clearly demo data).
  const team1 = team;
  const custs = await prisma.customer.findMany({ where: { organizationId: reg.org.id }, include: { locations: true, contracts: { include: { lines: true } } } });
  let n = 1000;
  for (let back = 13; back >= 1; back--) {
    const day = new Date(Date.now() - back * 86400_000).toISOString().slice(0, 10);
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    if (dow === 5 || dow === 6) continue; // Friday/Saturday off
    for (const [ci, c] of custs.entries()) {
      const line = c.contracts[0]?.lines[0];
      if (!line) continue;
      const failed = (back + ci) % 7 === 0;
      const start = new Date(`${day}T0${7 + ci}:15:00Z`);
      const wo = await prisma.workOrder.create({
        data: {
          organizationId: reg.org.id, number: `WO-H${n++}`, kind: "COLLECTION", customerId: c.id, serviceLocationId: line.serviceLocationId,
          contractId: c.contracts[0]!.id, wasteCategoryId: line.wasteCategoryId, teamId: team1.id, vehicleId: v1.id,
          status: failed ? "FAILED" : "COMPLETED", scheduledDate: new Date(`${day}T00:00:00Z`), actualStart: start,
          actualEnd: new Date(start.getTime() + (25 + ci * 7) * 60_000), failureReason: failed ? (ci === 1 ? "NO_ACCESS" : "WASTE_NOT_READY") : null,
          createdById: reg.user.id,
        },
      });
      if (!failed && line.billingUnit === "PER_TONNE") {
        const gross = 9900 + 900 + ((back * 137) % 1400);
        await prisma.weightTicket.create({ data: { organizationId: reg.org.id, workOrderId: wo.id, grossKg: String(gross), tareKg: "9900", netKg: String(gross - 9900), weighedAt: start, recordedById: reg.user.id } });
      }
    }
  }

  // Invoices built from that history through the normal services (one paid, one partially paid).
  const finance = (await loadContext((await prisma.user.findUniqueOrThrow({ where: { email: "finance@demo-collecte.test" } })).id, reg.org.id))!;
  for (const [i, c] of custs.slice(0, 2).entries()) {
    const done = await prisma.workOrder.findMany({ where: { organizationId: reg.org.id, customerId: c.id, status: "COMPLETED", number: { startsWith: "WO-H" } }, select: { id: true } });
    if (!done.length) continue;
    const draft = await createDraftInvoice(finance, { customerId: c.id, workOrderIds: done.map((w) => w.id) });
    await issueInvoice(finance, draft.id, { issueDate: new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10), dueDate: new Date(Date.now() + 27 * 86400_000).toISOString().slice(0, 10) });
    const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: draft.id } });
    const amount = i === 0 ? inv.total.toString() : (Math.round(Number(inv.total) * 40) / 100).toFixed(2);
    await recordPayment(finance, draft.id, { amount, method: "BANK_TRANSFER", receivedAt: new Date(Date.now() - 86400_000).toISOString().slice(0, 10), idempotencyKey: `seed-payment-${i}-0001` });
  }

  const plusSix = new Date(Date.now() + 6 * 86400_000).toISOString().slice(0, 10);
  await generateRecurringWorkOrders(dispatcher, { from: today, to: plusSix });

  // Municipality (synthetic) for the civic pilot
  const muni = await registerOrganization({ organizationName: "APC Démo", kind: "MUNICIPALITY", wilaya: "Alger", name: "Karima Démo", email: "civic@demo-apc.test", password: PASSWORD, locale: "ar" });
  await prisma.organization.update({ where: { id: muni.org.id }, data: { verificationStatus: "VERIFIED", commune: "Alger Centre" } });
  const mctx = (await loadContext(muni.user.id, muni.org.id))!;
  await createTeam(mctx, { name: "Brigade propreté" });
  for (const [cat, lat, lng, desc] of [
    ["ILLEGAL_DUMPING", "36.7538", "3.0588", "Dépôt de gravats sur le trottoir (exemple de démonstration)."],
    ["OVERFLOWING_BIN", "36.7650", "3.0500", "Bac débordant depuis trois jours (exemple de démonstration)."],
  ] as const) {
    await submitCivicReport({ municipality: muni.org.slug, category: cat, description: desc, latitude: lat, longitude: lng, clientSubmissionId: randomUUID() });
  }

  console.log(`Seeded synthetic demo data.
  Provider owner:  owner@demo-collecte.test / ${PASSWORD}
  Dispatcher:      dispatch@demo-collecte.test
  Field worker:    driver@demo-collecte.test
  Finance:         finance@demo-collecte.test
  Municipality:    civic@demo-apc.test`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
