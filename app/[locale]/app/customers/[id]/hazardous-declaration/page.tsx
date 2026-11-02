import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { annualDeclaration } from "@/server/services/hazardous";
import { orgToday } from "@/server/services/reports";
import { HazardousDeclarationView, YearPicker } from "@/components/hazardous-declaration";

export default async function CustomerHazardousDeclaration({ params, searchParams }: { params: Promise<{ locale: Locale; id: string }>; searchParams: Promise<{ year?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const sp = await searchParams;
  // Default: the year just closed (the declaration is due within three months after it).
  const year = sp.year && /^\d{4}$/.test(sp.year) ? Number(sp.year) : Number(orgToday(ctx).slice(0, 4)) - 1;
  const data = await orNotFound(annualDeclaration(ctx, id, year));
  return <HazardousDeclarationView data={data} d={d} locale={locale} yearPicker={<YearPicker year={year} label={d.hazardous.year} apply={d.common.apply} />} />;
}
