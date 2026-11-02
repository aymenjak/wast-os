import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { AuthCard } from "@/components/auth-card";
import { getInvitationByToken } from "@/server/services/accounts";
import { InviteForm } from "./invite-form";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ locale: Locale; token: string }> }) {
  const { locale, token } = await params;
  const d = getDictionary(locale);
  const inv = await getInvitationByToken(token);
  if (!inv) return <AuthCard title={d.auth.accept}><p role="alert" className="text-sm text-ink-700">{d.auth.inviteInvalid}</p></AuthCard>;
  return (
    <AuthCard title={d.auth.inviteTitle.replace("{org}", inv.organizationName)} lead={d.auth.inviteLead.replace("{role}", d.enums.OrgRole[inv.role])}>
      <p className="mb-4 text-sm text-ink-700"><span className="num">{inv.email}</span></p>
      <InviteForm token={token} existing={inv.userExists} />
    </AuthCard>
  );
}
