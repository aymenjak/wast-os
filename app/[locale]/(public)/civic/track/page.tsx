import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { trackLookupAction } from "@/app/actions/public";
import { Button } from "@/components/ui/button";

export default async function TrackPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = getDictionary(locale);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold text-ink-950">{d.civic.trackTitle}</h1>
      <p className="mt-1 text-sm text-ink-600">{d.civic.trackLead}</p>
      <form action={trackLookupAction} className="mt-6 flex gap-2">
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor="code" className="sr-only">{d.civic.trackingCode}</label>
        <input id="code" name="code" required dir="ltr" placeholder="NX-XXXX-XXXX-XXXX" className="h-10 flex-1 rounded-[var(--radius-control)] border border-ink-300 px-3 font-mono text-sm uppercase focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        <Button type="submit">{d.civic.track}</Button>
      </form>
    </div>
  );
}
