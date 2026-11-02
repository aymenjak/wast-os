import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { recoveryCertificate } from "@/server/services/recycling";
import { orgToday } from "@/server/services/reports";
import { RecoveryCertificateView } from "@/components/recovery-certificate";

export default async function CustomerRecovery({ params, searchParams }: { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ month?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : orgToday(ctx).slice(0, 7);
  return <RecoveryCertificateView data={await orNotFound(recoveryCertificate(ctx, id, month))} d={d} locale={locale} month={month} />;
}
