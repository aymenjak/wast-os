import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { currentTenantSetting } from "./tenant-scope";
import { PrismaClient, Prisma } from "@/lib/generated/prisma/client";

export type Tx = Prisma.TransactionClient;
export type Db = PrismaClient | Tx;

const globalForPrisma = globalThis as unknown as { __nexvoPrisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString });
  // Row-level security (D-91): each checkout states which organization it works for. The pg client runs queries in
  // order, so this runs before anything Prisma sends on the connection, transactions included. Session-level, and
  // reset at every checkout, so a value never carries over from a previous request.
  pool.on("acquire", (client) => {
    client.query("SELECT set_config('app.org_id', $1, false)", [currentTenantSetting()]).catch(() => undefined);
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma: PrismaClient = globalForPrisma.__nexvoPrisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.__nexvoPrisma = prisma;
