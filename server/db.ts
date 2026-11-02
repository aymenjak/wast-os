import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@/lib/generated/prisma/client";

export type Tx = Prisma.TransactionClient;
export type Db = PrismaClient | Tx;

const globalForPrisma = globalThis as unknown as { __nexvoPrisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma: PrismaClient = globalForPrisma.__nexvoPrisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.__nexvoPrisma = prisma;
