import { beforeAll, describe, expect, it } from "vitest";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { createCustomer } from "@/server/services/customers";
import { importCustomers, parseCsv, previewCustomerImport } from "@/server/services/customer-import";
import type { OrgContext } from "@/server/context";

/** Onboarding import: French/English/Arabic headers, ; or , delimiters, grouping by NIF, all-or-nothing, tenant-scoped. */
let a: OrgContext, b: OrgContext, viewer: OrgContext;

beforeAll(async () => {
  await resetDb();
  a = (await newOrg("SERVICE_PROVIDER", "Import A")).ctx;
  b = (await newOrg("SERVICE_PROVIDER", "Import B")).ctx;
  viewer = await addMember(a, "VIEWER");
  await createCustomer(a, { name: "Hôtel Existant (synthetic)" });
});

describe("CSV parsing", () => {
  it("handles BOM, ; delimiter, quotes with separators and escaped quotes, CRLF and blank lines", () => {
    const rows = parseCsv('﻿Nom;Adresse\r\n"Café ""Le Port""";"12; rue X"\r\n\r\nB;C\n');
    expect(rows).toEqual([["Nom", "Adresse"], ['Café "Le Port"', "12; rue X"], ["B", "C"]]);
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("preview and import", () => {
  const fr = [
    "Nom du client;Type;NIF;Téléphone;Nom du site;Adresse;Commune;Wilaya;Latitude;Longitude",
    "Supérette Test (synthetic);entreprise;000111;0550 00 00 00;Dépôt;Rue 1;Bir El Djir;Oran;35,73;-0,56",
    "Supérette Test (synthetic);entreprise;000111;;Magasin 2;Rue 2;Es Senia;Oran;;",
    "École Test (synthetic);institution;;;;;;;;",
    "Hôtel Existant (synthetic);;;;Annexe;Rue 3;;;;",
  ].join("\n");

  it("previews without writing: groups rows by NIF into one customer with several sites, skips existing customers", async () => {
    const before = await prisma.customer.count({ where: { organizationId: a.org.id } });
    const p = await previewCustomerImport(a, fr);
    expect([p.customers, p.locations, p.skipped, p.errors]).toEqual([2, 2, 1, 0]);
    expect(await prisma.customer.count({ where: { organizationId: a.org.id } })).toBe(before);
  });

  it("imports all at once, with sites and coordinates, then reports nothing new on a second run", async () => {
    expect(await importCustomers(a, fr)).toEqual({ customers: 2, locations: 2, skipped: 1 });
    const s = await prisma.customer.findFirstOrThrow({ where: { organizationId: a.org.id, taxId: "000111" }, include: { locations: { orderBy: { label: "asc" } } } });
    expect(s.locations.map((l) => l.label)).toEqual(["Dépôt", "Magasin 2"]);
    expect(Number(s.locations[0]!.latitude)).toBe(35.73);
    expect((await prisma.customer.findFirstOrThrow({ where: { organizationId: a.org.id, name: "École Test (synthetic)" } })).kind).toBe("INSTITUTION");
    await expect(importCustomers(a, fr)).rejects.toThrow("errors.import.nothingNew");
    expect(await prisma.auditEvent.count({ where: { organizationId: a.org.id, action: "customer.imported" } })).toBe(1);
  });

  it("refuses the whole file while a row has an error, and says which field", async () => {
    const bad = ["Name,Email,Address,Latitude", "Good One (synthetic),,,", "Bad Mail (synthetic),not-an-email,,", "Half Coords (synthetic),,Street,36.1"].join("\n");
    const p = await previewCustomerImport(a, bad);
    expect(p.errors).toBe(2);
    expect(p.rows.find((r) => r.name.startsWith("Bad"))!.errors).toContain("email");
    expect(p.rows.find((r) => r.name.startsWith("Half"))!.errors).toContain("longitude");
    await expect(importCustomers(a, bad)).rejects.toThrow("errors.import.hasErrors");
    expect(await prisma.customer.count({ where: { organizationId: a.org.id, name: "Good One (synthetic)" } })).toBe(0);
  });

  it("recognises Arabic headers and type values", async () => {
    const ar = ["اسم الزبون,النوع,العنوان,البلدية", "مخبزة تجريبية (synthetic),شركة,شارع 5,وهران"].join("\n");
    expect((await previewCustomerImport(a, ar)).customers).toBe(1);
  });

  it("needs a name column, a non-empty file, and the customers.write permission", async () => {
    expect((await previewCustomerImport(a, "Adresse\nRue 1")).missingName).toBe(true);
    await expect(previewCustomerImport(a, "Nom\n")).rejects.toThrow("errors.import.empty");
    await expect(previewCustomerImport(viewer, fr)).rejects.toThrow("errors.forbidden");
  });

  it("is tenant-scoped: the same file in another organization creates its own customers", async () => {
    expect((await previewCustomerImport(b, fr)).skipped).toBe(0);
    await importCustomers(b, fr);
    expect(await prisma.customer.count({ where: { organizationId: b.org.id } })).toBe(3);
  });
});
