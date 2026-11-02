import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { customerOptions, wasteCategoryOptions } from "@/server/services/customers";
import { orgToday } from "@/server/services/reports";
import { Forbidden, PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { RequestForm } from "@/components/forms/request-form";

export default async function NewRequest({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ customer?: string }> }) {
  const { ctx, d, locale } = await appPage(params);
  if (!ctx.permissions.has("requests.write")) return <Forbidden message={d.errors.forbiddenPage} />;
  const [customers, cats] = await Promise.all([customerOptions(ctx), wasteCategoryOptions(ctx)]);
  const { customer } = await searchParams;
  const name = (x: { nameEn: string; nameFr: string; nameAr: string }) => (locale === "ar" ? x.nameAr : locale === "fr" ? x.nameFr : x.nameEn);
  return (
    <>
      <PageHeader title={d.requests.new} />
      <Card className="max-w-3xl"><CardBody>
        <RequestForm customers={customers.map((c) => ({ ...c, name: `${c.name} (${c.code})` }))} categories={cats.map((c) => ({ id: c.id, name: name(c) }))} defaultCustomerId={customer} today={orgToday(ctx)} />
      </CardBody></Card>
    </>
  );
}
