/**
 * Grant or remove a platform role from the command line (operator with database access).
 * This is how the FIRST platform owner is created in a new deployment; afterwards owners manage
 * roles in the console (/platform/staff). The user must already have registered an account.
 *
 *   npm run platform:role -- someone@company.dz OWNER|ADMIN|SUPPORT|NONE
 */
import "dotenv/config";
import { prisma } from "../server/db";
import { audit } from "../server/audit";

async function main() {
  const [email, roleArg] = process.argv.slice(2);
  const roles = ["OWNER", "ADMIN", "SUPPORT", "NONE"] as const;
  if (!email || !roles.includes(roleArg as (typeof roles)[number])) throw new Error("Usage: npm run platform:role -- <email> <OWNER|ADMIN|SUPPORT|NONE>");
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error(`No account with email ${email}. Register it first.`);
  const role = roleArg === "NONE" ? null : (roleArg as "OWNER" | "ADMIN" | "SUPPORT");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { platformRole: role, isPlatformStaff: role !== null } });
    await audit(tx, { organizationId: null, actorType: "SYSTEM", action: "platform.staff_role_changed", entityType: "User", entityId: user.id, data: { from: user.platformRole, to: role, via: "cli" } });
  });
  console.log(`${email}: platform role = ${role ?? "none"}`);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
