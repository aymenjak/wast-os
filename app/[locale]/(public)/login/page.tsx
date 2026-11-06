import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { redirect } from "next/navigation";
import { workspaceHref } from "@/server/auth/session";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return { title: getDictionary((await params).locale).auth.signIn };
}

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ "no-org"?: string; suspended?: string; reset?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  // Already signed in: go to the workspace (except when the app itself sent the user here: no organization, suspended).
  if (!sp["no-org"] && !sp.suspended) {
    const home = await workspaceHref(locale);
    if (home) redirect(home);
  }
  const d = getDictionary(locale);
  return (
    <AuthCard title={d.auth.signInTitle} lead={d.auth.signInLead} footer={<>{d.auth.noAccount} <Link className="font-medium text-brand-700 hover:underline" href={`/${locale}/register`}>{d.nav.startTrial}</Link></>}>
      {sp["no-org"] ? <p role="status" className="mb-4 rounded-md bg-warning-100 px-3 py-2 text-sm text-warning-700">{d.auth.noOrganization}</p> : null}
      {sp.suspended ? <p role="alert" className="mb-4 rounded-md bg-danger-100 px-3 py-2 text-sm text-danger-700">{d.auth.suspended}</p> : null}
      {sp.reset ? <p role="status" className="mb-4 rounded-md bg-success-100 px-3 py-2 text-sm text-success-700">{d.auth.resetDone}</p> : null}
      <LoginForm />
      <p className="mt-4 text-center text-sm"><Link className="text-brand-700 hover:underline" href={`/${locale}/login/forgot`}>{d.auth.forgot}</Link></p>
    </AuthCard>
  );
}
