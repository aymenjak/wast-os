import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { collectionCertificate, orgToday } from "@/server/services/reports";
import { CertificateView, MonthPicker } from "@/components/certificate-view";

export default async function CertificatePage({ params, searchParams }: { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ month?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : orgToday(ctx).slice(0, 7);
  const data = await orNotFound(collectionCertificate(ctx, id, month));
  return <CertificateView data={data} d={d} locale={locale} month={month} monthPicker={<MonthPicker month={month} label={d.certificate.month} apply={d.common.apply} />} />;
}
