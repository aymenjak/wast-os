import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { prisma } from "@/server/db";
import { publicMapPoints } from "@/server/services/civic";
import { PublicMap } from "./public-map";

export const dynamic = "force-dynamic";

export default async function PublicMapPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const d = getDictionary(locale);
  const org = await prisma.organization.findFirst({ where: { slug, kind: "MUNICIPALITY", verificationStatus: "VERIFIED" }, select: { name: true } });
  if (!org) notFound();
  const points = await publicMapPoints(slug);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-ink-950">{d.civic.publicMapTitle}</h1>
      <p className="mt-1 text-sm text-ink-600">{org.name}, {d.civic.publicMapNote}</p>
      <div className="mt-6">
        <PublicMap points={points.map((p, i) => ({ id: String(i), lat: p.lat, lng: p.lng, status: p.status, label: `${d.enums.CivicCategory[p.category]} — ${d.enums.CivicReportStatus[p.status]}` }))} />
      </div>
    </div>
  );
}
