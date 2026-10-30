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
        { serviceLocationId: loc.id, wasteCategoryId: msw.id, frequency: "WEEKLY", billingUnit: i === 0 ? "PER_TONNE" : "PER_COLLECTION", unitPrice: i === 0 ? "4500" : "3500" },
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
