import { prisma } from "@/server/db";
import { registerOrganization, loadContext, inviteMember, acceptInvitation } from "@/server/services/accounts";
import type { OrgContext } from "@/server/context";
import type { OrgRole } from "@/lib/generated/prisma/enums";

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', 'spatial_ref_sys')`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  }
  await prisma.plan.createMany({
    data: [
      { code: "STARTER", name: "Starter", priceMonthly: "9900", priceYearly: "99000", maxUsers: 5, maxVehicles: 3, maxCustomers: 50, sortOrder: 1 },
      { code: "PRO", name: "Professional", priceMonthly: "29900", priceYearly: "299000", maxUsers: 25, maxVehicles: 15, maxCustomers: 500, customerPortal: true, advancedReports: true, sortOrder: 2 },
    ],
  });
}

let counter = 0;
export async function newOrg(kind: "SERVICE_PROVIDER" | "MUNICIPALITY" = "SERVICE_PROVIDER", name?: string) {
  counter++;
  const res = await registerOrganization({
    organizationName: name ?? `Org ${counter}`,
    kind,
    name: `Owner ${counter}`,
    email: `owner${counter}-${Date.now()}@example.test`,
    password: "correct-horse-battery",
    acceptPrivacy: true,
  });
  if (kind === "MUNICIPALITY") {
    await prisma.organization.update({ where: { id: res.org.id }, data: { verificationStatus: "VERIFIED" } });
  }
  const ctx = (await loadContext(res.user.id, res.org.id))!;
  return { ...res, ctx };
}

export async function addMember(owner: OrgContext, role: OrgRole, customerId?: string): Promise<OrgContext> {
  counter++;
  const email = `member${counter}-${Date.now()}@example.test`;
  const { token } = await inviteMember(owner, { email, role, customerId });
  const res = await acceptInvitation({ token, name: `Member ${counter}`, password: "correct-horse-battery" });
  return (await loadContext(res.user.id, owner.org.id))!;
}

/** A calendar day in the organizations' default timezone (Africa/Algiers), offset by N days. */
export function isoDay(offsetDays = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Algiers", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(Date.now() + offsetDays * 86400_000),
  );
}

/** Minimal valid JPEG with an EXIF APP1 segment containing a fake GPS marker. */
export function jpegWithExif(): Uint8Array {
  const exifPayload = Buffer.from("Exif\0\0GPS-LAT-36.7538-LNG-3.0588");
  const app1Len = exifPayload.length + 2;
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff, ...exifPayload,
    0xff, 0xdb, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0x33,
    0xff, 0xd9,
  ]);
}
