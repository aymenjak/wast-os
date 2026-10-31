import type { AiProvider, ChatInput, ChatResult } from "./provider";
import { AiUnavailableError } from "./provider";

/**
 * LOCAL DEMO ONLY — not an AI model. Lets the assistant screen be shown and tested without an API key:
 * it picks one of the real read-only tools from keywords, runs it with the user's permissions, and formats the
 * real result into a short reply. Enabled only with AI_DEMO_PROVIDER=1 AND a localhost APP_URL (fail closed),
 * and the UI shows a "demo mode" badge whenever it is active.
 */
export function demoProviderEnabled() {
  return process.env.AI_DEMO_PROVIDER === "1" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.APP_URL ?? "");
}

const T = {
  ar: { overdue: "فواتير متأخرة", none: "لا شيء متأخر.", balance: "رصيد", days: "يوم تأخير", wo: "أوامر العمل ليوم", alerts: "تنبيهات مفتوحة", soon: "حاويات قريبة من العتبة خلال 48 ساعة", summary: "ملخص آخر 30 يومًا", rate: "نسبة الإنجاز", failed: "محاولات متعذّرة", receivables: "مستحقات جارية", pending: "طلبات بانتظار المصادقة", noData: "لا توجد بيانات.", where: "للتصرف: افتح القائمة المناسبة في التطبيق." },
  fr: { overdue: "Factures en retard", none: "Rien en retard.", balance: "solde", days: "jours de retard", wo: "Ordres de travail du", alerts: "Alertes ouvertes", soon: "Bacs proches du seuil sous 48 h", summary: "Synthèse des 30 derniers jours", rate: "Taux de réalisation", failed: "Tentatives échouées", receivables: "Encours clients", pending: "Demandes à valider", noData: "Aucune donnée.", where: "Pour agir : ouvrez le menu correspondant dans l'application." },
  en: { overdue: "Overdue invoices", none: "Nothing overdue.", balance: "balance", days: "days late", wo: "Work orders for", alerts: "Open alerts", soon: "Bins near threshold within 48 h", summary: "Last 30 days", rate: "Completion rate", failed: "Failed attempts", receivables: "Receivables", pending: "Requests to validate", noData: "No data.", where: "To act, open the matching menu in the app." },
};

function pickTool(q: string) {
  const s = q.toLowerCase();
  if (/factur|invoice|فاتور|فواتير|مستحق|paiement|payment/.test(s)) return "list_overdue_invoices";
  if (/capteur|bac|sensor|bin|iot|حاوي|مستشعر|امتلاء/.test(s)) return "get_sensor_status";
  if (/aujourd|today|planning|prévu|work order|ordre|اليوم|مبرمج|أوامر/.test(s)) return "list_work_orders";
  return "get_operations_summary";
}

/** First-strong isolate: keeps Latin codes, numbers and units in order inside Arabic sentences. */
const iso = (s: string | number) => `\u2068${s}\u2069`;
const money = (n: number) => iso(`${n.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA`);

export const demoProvider: AiProvider = {
  async triageCivicReport() { throw new AiUnavailableError("disabled"); },
  async operationsBrief() { throw new AiUnavailableError("disabled"); },
  async chat(input: ChatInput): Promise<ChatResult> {
    const lang = /Arabic/.test(input.system) ? "ar" : /French/.test(input.system) ? "fr" : "en";
    const t = T[lang];
    const q = [...input.history].reverse().find((m) => m.role === "user")?.content ?? "";
    let tool = pickTool(q);
    if (!input.tools.some((x) => x.name === tool)) tool = input.tools[0]?.name ?? "search_records";
    const r = await input.execute(tool, {});
    if (r.isError) return { text: r.content, toolsUsed: [tool], model: "local-demo", inputTokens: 0, outputTokens: 0 };
    const d = JSON.parse(r.content);
    let text = t.noData;
    if (tool === "list_overdue_invoices") {
      const rows = d.overdue as { number: string; customer: string; daysLate: number; balanceDZD: number }[];
      text = rows.length ? `${t.overdue} (${rows.length}):\n${rows.slice(0, 5).map((x) => `• ${iso(x.number)} — ${iso(x.customer)}: ${t.balance} ${money(x.balanceDZD)}, ${iso(x.daysLate)} ${t.days}`).join("\n")}` : t.none;
    } else if (tool === "get_sensor_status") {
      const a = d.openAlerts as Record<string, number>;
      text = `${t.alerts}: ${Object.values(a).reduce((s, n) => s + n, 0)}\n${t.soon}: ${d.binsAtOrNearThreshold48h}\n${(d.soonest as { container: string; customer: string | null; fillPct: number | null }[]).slice(0, 3).map((x) => `• ${iso(x.container)}${x.customer ? ` (${iso(x.customer)})` : ""}: ${iso(`${x.fillPct ?? "—"} %`)}`).join("\n")}`;
    } else if (tool === "list_work_orders") {
      text = `${t.wo} ${d.date}: ${d.count}\n${(d.workOrders as { number: string; status: string; customer: string | null; team: string | null }[]).slice(0, 6).map((w) => `• ${iso(w.number)} — ${iso(w.customer ?? "")} · ${iso(w.status)}${w.team ? ` · ${iso(w.team)}` : ""}`).join("\n")}`;
    } else if (tool === "get_operations_summary") {
      text = `${t.summary}:\n• ${t.rate}: ${iso(`${Math.round((d.completionRate ?? 0) * 100)} %`)}\n• ${t.failed}: ${iso(d.failed30d)}\n• ${t.receivables}: ${money(d.receivablesDZD)}\n• ${t.pending}: ${iso(d.pendingRequests)}`;
    }
    return { text: `${text}\n\n${t.where}`, toolsUsed: [tool], model: "local-demo", inputTokens: 0, outputTokens: 0 };
  },
};
