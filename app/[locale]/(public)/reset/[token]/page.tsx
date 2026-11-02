import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { AuthCard } from "@/components/auth-card";
import { resetTokenValid } from "@/server/services/password-reset";
import { ResetForm } from "../forms";

export const metadata = { robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPage({ params }: { params: Promise<{ locale: Locale; token: string }> }) {
  const { locale, token } = await params;
  const d = getDictionary(locale);
  const valid = await resetTokenValid(token);
  return (
    <AuthCard title={d.auth.resetTitle} lead={valid ? d.auth.resetLead : undefined}>
      {valid ? <ResetForm token={token} /> : <p role="alert" className="text-sm text-danger-700">{d.errors.auth.resetInvalid} <Link className="underline" href={`/${locale}/login/forgot`}>{d.auth.forgot}</Link></p>}
    </AuthCard>
  );
}
