import { orgToday } from "@/server/services/reports";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { customerOptions, wasteCategoryOptions } from "@/server/services/customers";
import { Forbidden, PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { ContractForm } from "./contract-form";

export default async function NewContract({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ customer?: string }> }) {
  const { ctx, d, locale } = await appPage(params);
  if (!ctx.permissions.has("contracts.write")) return <Forbidden message={d.errors.forbiddenPage} />;
  const [customers, categories] = await Promise.all([customerOptions(ctx), wasteCategoryOptions(ctx)]);
  const { customer } = await searchParams;
  const name = (c: { nameEn: string; nameFr: string; nameAr: string }) => (locale === "ar" ? c.nameAr : locale === "fr" ? c.nameFr : c.nameEn);
  return (
    <>
      <PageHeader title={d.contracts.new} />
      <Card className="max-w-4xl">
        <CardBody>
          <ContractForm
            customers={customers.map((c) => ({ id: c.id, name: `${c.name} (${c.code})`, locations: c.locations }))}
            categories={categories.map((c) => ({ id: c.id, name: name(c) }))}
            defaultCustomerId={customer}
            today={orgToday(ctx)}
          />
        </CardBody>
      </Card>
    </>
  );
}
