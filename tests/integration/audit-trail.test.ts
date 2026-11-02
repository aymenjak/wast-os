import { beforeAll, describe, expect, it } from "vitest";
import { addMember, newOrg, resetDb } from "../helpers/db";
import { prisma } from "@/server/db";
import { inviteMember, revokeInvitation } from "@/server/services/accounts";
import { addTeamMember, createTeam, removeTeamMember } from "@/server/services/fleet";
import type { OrgContext } from "@/server/context";

/** Pre-pilot review: access-changing operations are audited, and the audit trail cannot be edited or deleted. */
let a: OrgContext;

beforeAll(async () => {
  await resetDb();
  a = (await newOrg()).ctx;
});

describe("audit trail", () => {
  it("records invitation revocation and team membership changes (they change who sees what)", async () => {
    const { invitation } = await inviteMember(a, { email: "audit-revoke@example.test", role: "VIEWER" });
    await revokeInvitation(a, invitation.id);
    const team = await createTeam(a, { name: "Équipe audit (synthetic)" });
    const worker = await addMember(a, "FIELD_WORKER");
    await addTeamMember(a, team.id, worker.membershipId);
    await removeTeamMember(a, team.id, worker.membershipId);
    const actions = (await prisma.auditEvent.findMany({ where: { organizationId: a.org.id }, select: { action: true } })).map((x: { action: string }) => x.action);
    expect(actions).toEqual(expect.arrayContaining(["member.invitation_revoked", "fleet.team_created", "fleet.team_member_added", "fleet.team_member_removed"]));
  });

  it("is append-only at the database level (UPDATE and DELETE refused, even for the app role)", async () => {
    const e = await prisma.auditEvent.findFirstOrThrow({ where: { organizationId: a.org.id } });
    await expect(prisma.auditEvent.update({ where: { id: e.id }, data: { action: "tampered" } })).rejects.toThrow(/append-only/);
    await expect(prisma.auditEvent.delete({ where: { id: e.id } })).rejects.toThrow(/append-only/);
    await expect(prisma.$executeRawUnsafe(`DELETE FROM "AuditEvent" WHERE "organizationId" = $1`, a.org.id)).rejects.toThrow(/append-only/);
    expect((await prisma.auditEvent.findUniqueOrThrow({ where: { id: e.id } })).action).toBe(e.action);
  });
});
