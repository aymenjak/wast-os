import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { Forbidden, PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { CustomerForm } from "../customer-form";

export default async function NewCustomerPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { ctx, d } = await appPage(params);
  if (!ctx.permissions.has("customers.write")) return <Forbidden message={d.errors.forbiddenPage} />;
  return (
    <>
      <PageHeader title={d.customers.new} />
      <Card className="max-w-2xl"><CardBody><CustomerForm /></CardBody></Card>
    </>
  );
}
