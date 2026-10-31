import type { OrgContext } from "./context";
import type { Dictionary } from "@/lib/i18n";
import type { NavSection } from "@/components/app-nav";

/** Navigation is derived from the same permission set the services enforce. Hiding a link is UX, not security. */
export function buildNav(ctx: OrgContext, d: Dictionary, locale: string): NavSection[] {
  const p = (x: string) => ctx.permissions.has(x as never);
  const base = `/${locale}/app`;
  const ops: NavSection = { title: d.nav.sectionOperations, items: [] };
  const commercial: NavSection = { title: d.nav.sectionCommercial, items: [] };
  const civic: NavSection = { title: d.nav.sectionCivic, items: [] };
  const admin: NavSection = { title: d.nav.sectionAdmin, items: [] };

  const top: NavSection = { items: [] };
  if (p("reports.read") && ctx.org.kind === "SERVICE_PROVIDER") top.items.push({ href: base, label: d.nav.dashboard, icon: "Gauge" });
  if (ctx.role === "FIELD_WORKER") top.items.push({ href: `${base}/work-orders`, label: d.workOrders.myWork, icon: "Wrench" });

  if (p("civic.read")) {
    civic.items.push({ href: `${base}/civic`, label: d.nav.civicOverview, icon: "Gauge" });
    civic.items.push({ href: `${base}/civic/queue`, label: d.nav.civicQueue, icon: "ShieldCheck" });
    civic.items.push({ href: `${base}/civic/map`, label: d.nav.civicMap, icon: "Map" });
  }
  if (p("requests.read")) ops.items.push({ href: `${base}/requests`, label: d.nav.requests, icon: "ClipboardList" });
  if (p("workorders.dispatch")) ops.items.push({ href: `${base}/dispatch`, label: d.nav.dispatch, icon: "CalendarRange" });
  if (p("workorders.read") && ctx.role !== "FIELD_WORKER") ops.items.push({ href: `${base}/work-orders`, label: d.nav.workOrders, icon: "Wrench" });
  if (p("fleet.read")) ops.items.push({ href: `${base}/fleet`, label: d.nav.fleet, icon: "Truck" });
  if (p("fleet.read") && ctx.org.kind === "SERVICE_PROVIDER") ops.items.push({ href: `${base}/containers`, label: d.nav.containers, icon: "Box" });

  if (p("customers.read")) commercial.items.push({ href: `${base}/customers`, label: d.nav.customers, icon: "Building2" });
  if (p("contracts.read")) commercial.items.push({ href: `${base}/contracts`, label: d.nav.contracts, icon: "FileText" });
  if (p("invoices.read")) commercial.items.push({ href: `${base}/invoices`, label: d.nav.invoices, icon: "Receipt" });
  if (p("reports.read") && ctx.org.kind === "SERVICE_PROVIDER") commercial.items.push({ href: `${base}/reports`, label: d.nav.reports, icon: "BarChart3" });

  if (p("team.manage")) admin.items.push({ href: `${base}/team`, label: d.nav.team, icon: "Users" });
  if (p("settings.manage")) admin.items.push({ href: `${base}/settings`, label: d.nav.settings, icon: "Settings" });
  if (!ctx.support) admin.items.push({ href: `${base}/support`, label: d.nav.support, icon: "LifeBuoy" });

  return [top, civic, ops, commercial, admin].filter((s) => s.items.length > 0);
}

/** Landing page for a role after sign-in. */
export function homeFor(ctx: OrgContext, locale: string) {
  if (ctx.role === "CUSTOMER_PORTAL") return `/${locale}/portal`;
  if (ctx.org.kind === "MUNICIPALITY") return `/${locale}/app/civic`;
  if (ctx.role === "FIELD_WORKER") return `/${locale}/app/work-orders`;
  return null;
}
