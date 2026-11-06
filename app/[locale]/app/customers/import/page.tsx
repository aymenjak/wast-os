import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { Card, CardBody } from "@/components/ui/card";
import { Forbidden, PageHeader } from "@/components/ui/misc";
import { CustomerImport } from "./import-client";

export default async function CustomerImportPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale, ctx, d } = await appPage(params);
  if (!ctx.permissions.has("customers.write") || ctx.support) return <Forbidden message={d.errors.forbiddenPage} />;
  return (
    <>
      <PageHeader eyebrow={<Link href={`/${locale}/app/customers`} className="hover:underline">{d.customers.title}</Link>} title={d.customers.importTitle} description={d.customers.importLead} />
      <Card><CardBody><CustomerImport /></CardBody></Card>
    </>
  );
}
