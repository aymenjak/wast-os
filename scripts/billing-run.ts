/**
 * Daily NEXVO subscription billing. Idempotent: safe to run several times a day.
 * Schedule once a day (e.g. cron `15 6 * * *`):  npm run billing:run
 */
import "dotenv/config";
import { prisma } from "../server/db";
import { runBilling } from "../server/services/billing";
import { audit } from "../server/audit";

runBilling()
  .then(async (r) => {
    await audit(prisma, { organizationId: null, actorType: "SYSTEM", action: "platform.billing_run", entityType: "PlatformBillingSettings", entityId: "1", data: r });
    console.log(JSON.stringify(r));
    await prisma.$disconnect();
  })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
