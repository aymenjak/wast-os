import type { Db } from "./db";
import type { ActorType } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function audit(
  db: Db,
  e: {
    organizationId: string | null;
    actorType?: ActorType;
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    data?: Prisma.InputJsonValue;
  },
) {
  await db.auditEvent.create({
    data: {
      organizationId: e.organizationId,
      actorType: e.actorType ?? "USER",
      actorUserId: e.actorUserId ?? null,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      data: e.data,
    },
  });
}
