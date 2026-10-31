import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { AuthCard } from "@/components/auth-card";
import { challengeToken } from "@/server/auth/session";
import { SecondFactorForm } from "./form";

export default async function SecondFactorPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  if (!(await challengeToken())) redirect(`/${locale}/login`);
  const d = getDictionary(locale);
  return (
    <AuthCard title={d.mfa.challengeTitle} lead={d.mfa.challengeLead}>
      <SecondFactorForm />
    </AuthCard>
  );
}
