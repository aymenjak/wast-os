import type { Locale } from "@/lib/i18n/config";
import { appPage } from "@/server/page";
import { customerOptions } from "@/server/services/customers";
import { billableWorkOrders } from "@/server/services/invoices";
import { formatDay, formatNumber } from "@/lib/i18n/format";
import { Forbidden, PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DraftForm } from "./draft-form";

export default async function NewInvoice({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ customer?: string }> }) {
  const { ctx, d, locale } = await appPage(params);
  if (!ctx.permissions.has("invoices.write")) return <Forbidden message={d.errors.forbiddenPage} />;
  const customers = await customerOptions(ctx);
  const { customer } = await searchParams;
  const selected = customers.find((c) => c.id === customer);
  const billable = selected ? await billableWorkOrders(ctx, selected.id) : [];
  const name = (x: { nameEn: string; nameFr: string; nameAr: string }) => (locale === "ar" ? x.nameAr : locale === "fr" ? x.nameFr : x.nameEn);
  return (
    <>
      <PageHeader title={d.invoices.new} />
      <Card className="max-w-3xl">
        <CardBody className="space-y-6">
          <form className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="customer" className="text-sm font-medium text-ink-800">{d.invoices.customer}</label>
              <select id="customer" name="customer" defaultValue={selected?.id ?? ""} required className="h-10 rounded-[var(--radius-control)] border border-ink-300 bg-white px-3 text-sm">
                <option value="" disabled>—</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <Button type="submit" variant="secondary">{d.common.apply}</Button>
          </form>
          {selected ? (
            <DraftForm
              customerId={selected.id}
              orders={billable.map((w) => ({
                id: w.id,
                label: `${w.number}, ${formatDay(w.scheduledDate, locale)}, ${w.serviceLocation?.label ?? ""}, ${w.wasteCategory ? name(w.wasteCategory) : ""}`,
                weight: w.weightTickets.length ? `${formatNumber(w.weightTickets.reduce((s, t) => s + Number(t.netKg), 0), locale)} kg` : null,
              }))}
            />
          ) : null}
        </CardBody>
      </Card>
    </>
  );
}
