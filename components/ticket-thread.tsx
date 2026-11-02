import type { Dictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { formatDateTime } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

/** Conversation thread: customer messages on the start side, NEXVO support on the end side. */
export function TicketThread({ messages, names, d, locale, tz, viewer }: {
  messages: { id: string; authorUserId: string; authorIsStaff: boolean; body: string; createdAt: Date }[];
  names: Record<string, string>; d: Dictionary; locale: Locale; tz: string; viewer: "customer" | "staff";
}) {
  return (
    <ol className="space-y-4">
      {messages.map((m) => {
        const mine = viewer === "staff" ? m.authorIsStaff : !m.authorIsStaff;
        return (
          <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-[var(--radius-card)] border px-4 py-3", m.authorIsStaff ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-900")}>
              <div className={cn("mb-1 text-xs", m.authorIsStaff ? "text-[#c9d3d1]" : "text-ink-600")}>
                <bdi>{m.authorIsStaff ? d.support.staff : names[m.authorUserId] ?? ""}</bdi> · <bdi>{formatDateTime(m.createdAt, locale, tz)}</bdi>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
