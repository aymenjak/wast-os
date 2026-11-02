/** Daily data retention (GPS, sensor readings, sent emails, AI chats, expired sessions/tokens):  npm run retention:run */
import "dotenv/config";
import { prisma } from "../server/db";
import { runRetention } from "../server/services/retention";

runRetention()
  .then(async (r) => { console.log(JSON.stringify(r)); await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
