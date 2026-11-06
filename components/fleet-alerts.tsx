import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { FleetAlert } from "@/server/services/fleet";
import { formatDay } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/config";

/** Expired or soon-due vehicle documents and maintenance; expired first, in red. */
export function FleetAlerts({ alerts, d, locale }: { alerts: FleetAlert[]; d: Dictionary; locale: Locale }) {
  const when = (a: FleetAlert) => (a.expired ? d.fleet.expired.replace("{n}", String(-a.daysLeft)) : a.daysLeft === 0 ? d.fleet.dueToday : d.fleet.dueIn.replace("{n}", String(a.daysLeft)));
  return (
    <ul className="divide-y divide-ink-100">
      {alerts.map((a) => (
        <li key={`${a.vehicleId}-${a.kind}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
          <span>
            <Link href={`/${locale}/app/fleet/${a.vehicleId}`} className="num font-medium text-ink-900 hover:underline">{a.plateNumber}</Link>
            <span className="text-ink-600"> · {d.enums.VehicleDocumentKind[a.kind]}</span>
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${a.expired ? "bg-danger-100 text-danger-700" : "bg-warning-100 text-warning-700"}`}>
            {when(a)} · <bdi>{formatDay(a.dueOn, locale)}</bdi>
          </span>
        </li>
      ))}
    </ul>
  );
}
