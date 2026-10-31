/** Removes a user's two-step verification (lost phone and recovery codes). Operator with database access only. */
import "dotenv/config";
import { prisma } from "../server/db";
import { resetMfa } from "../server/services/mfa";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Usage: npm run platform:reset-2fa -- <email>");
  const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!u) throw new Error(`No account with email ${email}`);
  await resetMfa(u.id, null);
  console.log(`${email}: two-step verification removed; all sessions ended. The user must enroll again.`);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
