/** Delivers queued emails (run every minute from cron or the host scheduler):  npm run outbox:work */
import "dotenv/config";
import { prisma } from "../server/db";
import { processOutbox } from "../server/services/mailer";

processOutbox(200)
  .then(async (r) => { console.log(JSON.stringify(r)); await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
