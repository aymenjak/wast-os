import { prisma } from "../db";
import { audit } from "../audit";

/**
 * Data retention (daily, `npm run retention:run`). Windows are configurable; defaults are conservative
 * proposals pending legal review (PRIVACY-AND-COMPLIANCE.md). Deletes in batches to keep transactions short.
 */
const days = (env: string | undefined, fallback: number) => {
  const n = Number(env);
  return Number.isInteger(n) && n >= 1 ? n : fallback;
};

export function retentionWindows() {
  return {
    gpsDays: days(process.env.GPS_RETENTION_DAYS, 90),
    sensorDays: days(process.env.SENSOR_RETENTION_DAYS, 400),
    emailDays: days(process.env.EMAIL_RETENTION_DAYS, 180),
    aiChatDays: days(process.env.AI_CHAT_RETENTION_DAYS, 90),
  };
}

async function batched(del: () => Promise<number>) {
  let total = 0;
  for (let i = 0; i < 1000; i++) {
    const n = await del();
    total += n;
    if (n < 5000) break;
  }
  return total;
}

export async function runRetention(now = new Date()) {
  const w = retentionWindows();
  const before = (d: number) => new Date(now.getTime() - d * 86400_000);
  const r = {
    vehiclePositions: await batched(() => prisma.$executeRaw`DELETE FROM "VehiclePosition" WHERE "id" IN (SELECT "id" FROM "VehiclePosition" WHERE "recordedAt" < ${before(w.gpsDays)} LIMIT 5000)`),
    sensorReadings: await batched(() => prisma.$executeRaw`DELETE FROM "SensorReading" WHERE "id" IN (SELECT "id" FROM "SensorReading" WHERE "measuredAt" < ${before(w.sensorDays)} LIMIT 5000)`),
    emails: (await prisma.notification.deleteMany({ where: { channel: "EMAIL", OR: [{ sentAt: { lt: before(w.emailDays) } }, { failedAt: { lt: before(w.emailDays) } }] } })).count,
    aiConversations: (await prisma.aiConversation.deleteMany({ where: { updatedAt: { lt: before(w.aiChatDays) } } })).count,
    sessions: (await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } })).count,
    loginChallenges: (await prisma.loginChallenge.deleteMany({ where: { expiresAt: { lt: now } } })).count,
    passwordResets: (await prisma.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } })).count,
    rateLimitBuckets: (await prisma.rateLimitBucket.deleteMany({ where: { resetAt: { lt: now } } })).count,
  };
  await audit(prisma, { organizationId: null, actorType: "SYSTEM", action: "platform.retention_run", entityType: "Retention", entityId: now.toISOString().slice(0, 10), data: { ...r, windows: w } });
  return r;
}
