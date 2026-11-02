import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { AuthCard } from "@/components/auth-card";
import { ForgotForm } from "../../reset/forms";

export default async function ForgotPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const d = getDictionary((await params).locale);
  return <AuthCard title={d.auth.forgotTitle} lead={d.auth.forgotLead}><ForgotForm /></AuthCard>;
}
