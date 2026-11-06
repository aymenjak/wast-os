/**
 * One-off: encrypts citizen names and contacts stored before field encryption (civic reports). Idempotent: values already
 * encrypted ("v1." prefix) are skipped. Needs APP_ENCRYPTION_KEY and DATABASE_URL. Run: npx tsx --conditions=react-server scripts/ops/encrypt-existing-pii.ts
 */
import "dotenv/config";
import { prisma } from "../../server/db";
import { encryptPII, encryptionConfigured } from "../../server/crypto";

async function main() {
  if (!encryptionConfigured()) throw new Error("APP_ENCRYPTION_KEY is missing or invalid");
  const rows = await prisma.civicReport.findMany({
    where: { OR: [{ reporterName: { not: null } }, { reporterContact: { not: null } }] },
    select: { id: true, reporterName: true, reporterContact: true },
  });
  let n = 0;
  for (const r of rows) {
    const name = r.reporterName && !r.reporterName.startsWith("v1.") ? encryptPII(r.reporterName) : r.reporterName;
    const contact = r.reporterContact && !r.reporterContact.startsWith("v1.") ? encryptPII(r.reporterContact) : r.reporterContact;
    if (name !== r.reporterName || contact !== r.reporterContact) {
      await prisma.civicReport.update({ where: { id: r.id }, data: { reporterName: name, reporterContact: contact } });
      n++;
    }
  }
  console.log(`Encrypted ${n} of ${rows.length} civic reports with personal data.`);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
