import { beforeAll, describe, expect, it } from "vitest";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { addServiceLocation, createCustomer } from "@/server/services/customers";
import { addWeightTicket } from "@/server/services/work-orders";
import { classifyCategory, createDestination } from "@/server/services/recycling";
import { annualDeclaration, cancelMovement, createMovement, deliver, getMovement, listMovements, pickUp, refuse, setTransportAuthorisation } from "@/server/services/hazardous";
import type { OrgContext } from "@/server/context";

/** Special hazardous waste: décret 04-409 (transport), 05-315 (annual declaration), law 01-19 art. 15/19. */
let a: OrgContext;
let b: OrgContext;
let customerId: string;
let licensed: string, unlicensed: string;
const year = new Date().getUTCFullYear();
const nextYear = `${year + 1}-12-31`;

const base = () => ({ customerId, destinationId: licensed, wasteCode: "20.1.1", consistency: "LIQUID", quantityKg: "350", packaging: "Fûts métalliques 200 L (synthetic)", labelled: "on" });

beforeAll(async () => {
  await resetDb();
  a = (await newOrg()).ctx;
  b = (await newOrg()).ctx;
  customerId = (await createCustomer(a, { name: "Garage Démo (synthetic)" })).id;
  licensed = (await createDestination(a, { name: "Installation agréée Démo", kind: "INCINERATION", registrationNumber: "AUT-DSD-0001 (synthetic)" })).id;
  unlicensed = (await createDestination(a, { name: "Ferrailleur sans agrément", kind: "RECYCLER" })).id;
});

describe("carrier authorisation (04-409 art. 13–16)", () => {
  it("no movement without a valid authorisation; admins only set it", async () => {
    await expect(createMovement(a, base())).rejects.toThrow("errors.hazardous.noAuthorisation");
    await setTransportAuthorisation(a, { hazTransportAuthNumber: "AUT-T-77 (synthetic)", hazTransportAuthExpiresOn: "2020-01-01" });
    await expect(createMovement(a, base())).rejects.toThrow("errors.hazardous.authorisationExpired");
    await expect(setTransportAuthorisation(a, { hazTransportAuthNumber: "X", hazTransportAuthExpiresOn: "" })).rejects.toThrow("errors.validation");
    const driver = await addMember(a, "FIELD_WORKER");
    await expect(setTransportAuthorisation(driver, { hazTransportAuthNumber: "X", hazTransportAuthExpiresOn: nextYear })).rejects.toThrow();
    await setTransportAuthorisation(a, { hazTransportAuthNumber: "AUT-T-77 (synthetic)", hazTransportAuthExpiresOn: nextYear });
  });
});

describe("movements (04-409 art. 17–21)", () => {
  it("only SD codes of décret 06-104, only licensed destinations, only own records", async () => {
    await expect(createMovement(a, { ...base(), wasteCode: "20.3.1" })).rejects.toThrow("errors.hazardous.notSdCode"); // MA code
    await expect(createMovement(a, { ...base(), wasteCode: "20.1.8" })).rejects.toThrow("errors.hazardous.notSdCode"); // S, not SD
    await expect(createMovement(a, { ...base(), destinationId: unlicensed })).rejects.toThrow("errors.recycling.specialNeedsLicence");
    const foreign = (await createCustomer(b, { name: "Other" })).id;
    await expect(createMovement(a, { ...base(), customerId: foreign })).rejects.toThrow();
    const m = await createMovement(a, base());
    expect(m.number).toBe("DM-00001");
    expect(m.designation).toBe("Solvants"); // copied from annex III
    expect(m.hazardCriteria).toContain("Inflammable");
    expect(m.carrierAuthNumber).toBe("AUT-T-77 (synthetic)");
    await expect(getMovement(b, m.id)).resolves.toBeNull();
    await expect(pickUp(b, m.id, { shipperSignedName: "X" })).rejects.toThrow();
    expect(await listMovements(b)).toHaveLength(0);
  });

  it("three signatures in order; labels before pickup; decontamination before delivery; refusal recorded; audited", async () => {
    const unlabelled = await createMovement(a, { ...base(), labelled: "" });
    await expect(pickUp(a, unlabelled.id, { shipperSignedName: "M. Expéditeur" })).rejects.toThrow("errors.hazardous.notLabelled");
    await cancelMovement(a, unlabelled.id);

    const m = await createMovement(a, base());
    await expect(deliver(a, m.id, { consigneeSignedName: "Mme Destinataire", decontaminated: "on" })).rejects.toThrow("errors.invalidTransition");
    const driver = await addMember(a, "FIELD_WORKER");
    await pickUp(driver, m.id, { shipperSignedName: "M. Expéditeur" });
    await expect(deliver(driver, m.id, { consigneeSignedName: "Mme Destinataire" })).rejects.toThrow("errors.hazardous.notDecontaminated");
    await deliver(driver, m.id, { consigneeSignedName: "Mme Destinataire", decontaminated: "on" });
    const done = (await getMovement(a, m.id))!;
    expect(done.status).toBe("DELIVERED");
    expect(done.shipperSignedName).toBe("M. Expéditeur");
    expect(done.carrierSignedName).toBeTruthy(); // the signed-in carrier
    expect(done.consigneeSignedAt).toBeTruthy();
    await expect(refuse(a, m.id, { refusedByRole: "CONSIGNEE", refusalReason: "x" })).rejects.toThrow("errors.invalidTransition");

    const r = await createMovement(a, base());
    await refuse(a, r.id, { refusedByRole: "CARRIER", refusalReason: "Fûts non étanches" });
    expect((await getMovement(a, r.id))!.status).toBe("REFUSED");
    const actions = (await prisma.auditEvent.findMany({ where: { organizationId: a.org.id, entityType: "HazardousMovement" }, select: { action: true } })).map((x: { action: string }) => x.action);
    expect(actions).toEqual(expect.arrayContaining(["hazardous.movement_created", "hazardous.movement_picked_up", "hazardous.movement_delivered", "hazardous.movement_refused", "hazardous.movement_cancelled"]));
  });

  it("the database itself refuses a delivered movement without decontamination", async () => {
    const m = await createMovement(a, base());
    await expect(prisma.hazardousMovement.update({ where: { id: m.id }, data: { status: "DELIVERED", shipperSignedAt: new Date(), carrierSignedAt: new Date(), consigneeSignedAt: new Date(), decontaminated: false } })).rejects.toThrow();
  });
});

describe("annual declaration (05-315)", () => {
  it("pre-fills quantities, code, criteria and section C from tickets of SD categories; portal sees only its own", async () => {
    const cat = await prisma.wasteCategory.findFirstOrThrow({ where: { organizationId: a.org.id, code: "SPECIAL" } });
    await classifyCategory(a, cat.id, { stream: "SPECIAL", regulatoryClass: "SPECIAL_HAZARDOUS", nomenclatureCode: "20.1.1" });
    const loc = await addServiceLocation(a, customerId, { label: "Atelier", addressLine: "Rue test", wilaya: "Oran" });
    const wo = await prisma.workOrder.create({ data: { organizationId: a.org.id, number: "WO-HZ1", kind: "COLLECTION", status: "IN_PROGRESS", customerId, serviceLocationId: loc.id, wasteCategoryId: cat.id, scheduledDate: new Date(), createdById: a.userId } });
    await addWeightTicket(a, wo.id, { grossKg: "10400", tareKg: "10000", destinationId: licensed });
    const d = await annualDeclaration(a, customerId, year);
    expect(d.dueBy).toBe(`${year + 1}-03-31`);
    expect(d.lines).toHaveLength(1);
    // 400 kg from the weight ticket + 350 kg from the delivered transport (not linked to a work order), same code → one line.
    expect(d.lines[0]).toMatchObject({ code: "20.1.1", designation: "Solvants", tonnes: 0.75, c: { elimination: 0.75, recycling: 0, reuse: 0, valorisation: 0 } });
    expect(d.lines[0]!.criteria).toContain("Inflammable");
    expect(d.movements.length).toBeGreaterThanOrEqual(1);

    const portal = await addMember(a, "CUSTOMER_PORTAL", customerId);
    expect((await annualDeclaration(portal, customerId, year)).lines).toHaveLength(1);
    const other = (await createCustomer(a, { name: "Autre client" })).id;
    await expect(annualDeclaration(portal, other, year)).rejects.toThrow();
    await expect(annualDeclaration(b, customerId, year)).rejects.toThrow();
    await expect(annualDeclaration(await addMember(a, "FIELD_WORKER"), customerId, year)).rejects.toThrow();
  });
});
