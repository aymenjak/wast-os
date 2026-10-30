import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "./register-form";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }) {
  return { title: getDictionary((await params).locale).auth.registerTitle };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = getDictionary(locale);
  return (
    <AuthCard title={d.auth.registerTitle} lead={d.auth.registerLead} footer={<>{d.auth.haveAccount} <Link className="font-medium text-brand-700 hover:underline" href={`/${locale}/login`}>{d.auth.signIn}</Link></>}>
      <RegisterForm />
    </AuthCard>
  );
}
