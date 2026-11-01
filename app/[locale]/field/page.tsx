import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { requireOrg } from "@/server/auth/session";
import { Forbidden } from "@/components/ui/misc";
import { FieldApp } from "@/components/field/field-app";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(locale).fieldApp.title, manifest: "/field.webmanifest", robots: { index: false } };
}

/**
 * Offline driver app (D-77). The page itself carries no job data — jobs come from /api/field/v1/bundle into
 * IndexedDB — so the copy the service worker keeps holds no customer data, only the interface.
 */
export default async function FieldPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const ctx = await requireOrg(locale);
  const d = getDictionary(locale);
  if (!ctx.permissions.has("workorders.execute") || ctx.support) return <main id="main" className="p-6"><Forbidden message={d.errors.forbiddenPage} /></main>;
  return <FieldApp membershipId={ctx.membershipId} />;
}
