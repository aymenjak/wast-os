import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { getCustomer } from "@/server/services/customers";
import { formatDateTime, formatDay, formatMoney } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { DescriptionList, EmptyState, PageHeader } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { Disclosure } from "@/components/inline-action";
import { CustomerForm } from "../customer-form";
import { ContactForm, LocationForm, NoteForm } from "./forms";

export default async function CustomerDetail({ params }: { params: Promise<{ locale: Locale; id: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { id } = await params;
  const c = await orNotFound(getCustomer(ctx, id));
  const canWrite = ctx.permissions.has("customers.write");
  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/${locale}/app/customers`} className="hover:underline">{d.customers.title}</Link>}
        title={c.name}
        description={<><span className="num">{c.code}</span>, {d.enums.CustomerKind[c.kind]}</>}
        actions={
          <>
            <StatusBadge status={c.status} label={d.enums.CustomerStatus[c.status]} />
            <ButtonLink variant="ghost" size="sm" href={`/${locale}/app/customers/${c.id}/certificate`}>{d.certificate.generate}</ButtonLink>
            <ButtonLink variant="ghost" size="sm" href={`/${locale}/app/customers/${c.id}/recovery`}>{d.recycling.certificate}</ButtonLink>
            <ButtonLink variant="ghost" size="sm" href={`/${locale}/app/customers/${c.id}/hazardous-declaration`}>{d.hazardous.declarationShort}</ButtonLink>
            {ctx.permissions.has("contracts.write") ? <ButtonLink variant="secondary" size="sm" href={`/${locale}/app/contracts/new?customer=${c.id}`}>{d.contracts.new}</ButtonLink> : null}
            {ctx.permissions.has("requests.write") ? <ButtonLink size="sm" href={`/${locale}/app/requests/new?customer=${c.id}`}>{d.requests.new}</ButtonLink> : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={d.common.details} />
            <CardBody>
              <DescriptionList items={[
                [d.customers.taxId, c.taxId ? <span className="num">{c.taxId}</span> : null],
                [d.common.email, c.email ? <span className="num">{c.email}</span> : null],
                [d.common.phone, c.phone ? <span className="num">{c.phone}</span> : null],
                [d.customers.billingAddress, c.billingAddress],
                [d.customers.serviceConditions, c.serviceConditions],
              ]} />
              {canWrite ? <div className="mt-4"><Disclosure summary={d.common.edit}><CustomerForm customer={c} /></Disclosure></div> : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={d.customers.locations} />
            {c.locations.length ? (
              <ul className="divide-y divide-ink-100">
                {c.locations.map((l) => (
                  <li key={l.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                    <MapPin aria-hidden className="mt-0.5 size-4 text-ink-500" />
                    <div className="min-w-0">
                      <div className="font-medium text-ink-900">{l.label}</div>
                      <div className="text-ink-600">{[l.addressLine, l.commune, l.wilaya].filter(Boolean).join(", ")}</div>
                      <div className="num text-xs text-ink-500">{l.latitude && l.longitude ? `${l.latitude}, ${l.longitude}` : d.customers.noCoordinates}</div>
                      {l.accessNotes ? <div className="mt-1 text-xs text-ink-600">{l.accessNotes}</div> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title={d.contracts.needsLocation} />}
            {canWrite ? <div className="border-t border-ink-100 p-4"><Disclosure summary={d.customers.addLocation} defaultOpen={c.locations.length === 0}><LocationForm customerId={c.id} /></Disclosure></div> : null}
          </Card>

          <Card>
            <CardHeader title={d.contracts.title} />
            {c.contracts.length ? (
              <ul className="divide-y divide-ink-100 text-sm">
                {c.contracts.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <Link href={`/${locale}/app/contracts/${k.id}`} className="font-medium text-ink-900 hover:underline">{k.title}, <span className="num text-ink-600">{k.reference}</span></Link>
                    <StatusBadge status={k.status} label={d.enums.ContractStatus[k.status]} />
                  </li>
                ))}
              </ul>
            ) : <EmptyState title={d.contracts.empty} />}
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title={d.customers.recentWork} />
              <ul className="divide-y divide-ink-100 text-sm">
                {c.workOrders.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-2 px-5 py-2">
                    <Link className="num font-medium hover:underline" href={`/${locale}/app/work-orders/${w.id}`}>{w.number}</Link>
                    <span className="text-xs text-ink-500">{formatDay(w.scheduledDate, locale)}</span>
                    <StatusBadge status={w.status} label={d.enums.WorkOrderStatus[w.status]} />
                  </li>
                ))}
              </ul>
              {c.workOrders.length === 0 ? <EmptyState title={d.workOrders.empty} /> : null}
            </Card>
            {ctx.permissions.has("invoices.read") ? <Card>
              <CardHeader title={d.customers.recentInvoices} />
              <ul className="divide-y divide-ink-100 text-sm">
                {c.invoices.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 px-5 py-2">
                    <Link className="num font-medium hover:underline" href={`/${locale}/app/invoices/${i.id}`}>{i.number ?? d.invoices.draft}</Link>
                    <span className="num text-xs text-ink-600">{formatMoney(i.total, locale, i.currency)}</span>
                    <StatusBadge status={i.status} label={d.enums.InvoiceStatus[i.status]} />
                  </li>
                ))}
              </ul>
              {c.invoices.length === 0 ? <EmptyState title={d.invoices.empty} /> : null}
            </Card> : null}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={d.customers.contacts} />
            <ul className="divide-y divide-ink-100 text-sm">
              {c.contacts.map((p) => (
                <li key={p.id} className="px-5 py-3">
                  <div className="flex items-center gap-1.5 font-medium text-ink-900">{p.name}{p.isPrimary ? <Star aria-label={d.customers.primary} className="size-3.5 fill-sand-600 text-sand-600" /> : null}</div>
                  {p.jobTitle ? <div className="text-ink-600">{p.jobTitle}</div> : null}
                  <div className="num text-xs text-ink-500">{[p.email, p.phone].filter(Boolean).join(", ")}</div>
                </li>
              ))}
            </ul>
            {canWrite ? <div className="border-t border-ink-100 p-4"><Disclosure summary={d.customers.addContact}><ContactForm customerId={c.id} /></Disclosure></div> : null}
          </Card>
          <Card>
            <CardHeader title={d.customers.notesTitle} />
            <CardBody className="space-y-4">
              {canWrite ? <NoteForm customerId={c.id} /> : null}
              <ul className="space-y-3">
                {c.notes.map((n) => (
                  <li key={n.id} className="text-sm">
                    <p className="whitespace-pre-wrap text-ink-800">{n.body}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{c.noteAuthors[n.authorId] ?? "—"}, {formatDateTime(n.createdAt, locale, ctx.org.timezone)}</p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          {ctx.permissions.has("team.manage") ? (
            <ButtonLink variant="secondary" className="w-full" href={`/${locale}/app/team?customer=${c.id}`}>{d.customers.inviteToPortal}</ButtonLink>
          ) : null}
        </div>
      </div>
    </>
  );
}
