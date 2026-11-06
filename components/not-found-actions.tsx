"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const T = {
  ar: { back: "رجوع", app: "مساحة العمل", home: "الصفحة الرئيسية", lead: "الرابط غير صحيح، أو هذه الصفحة غير متاحة لحسابك." },
  fr: { back: "Retour", app: "Mon espace", home: "Accueil", lead: "Le lien est erroné, ou cette page n’est pas accessible avec votre compte." },
  en: { back: "Go back", app: "My workspace", home: "Home", lead: "The link is wrong, or this page is not available to your account." },
} as const;

/** Ways out of a 404, in the page's language: back, to the workspace, home. No prefetch (the workspace may redirect). */
export function NotFoundActions() {
  const params = useParams<{ locale?: string }>();
  const router = useRouter();
  const l = params?.locale === "ar" || params?.locale === "en" ? params.locale : "fr";
  const t = T[l];
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-ink-600">{t.lead}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => (history.length > 1 ? router.back() : router.push(`/${l}/app`))} className="inline-flex h-10 items-center rounded-[var(--radius-control)] border border-ink-200 bg-white px-4 text-sm font-medium text-ink-900 hover:bg-ink-50">{t.back}</button>
        <Link prefetch={false} href={`/${l}/app`} className="inline-flex h-10 items-center rounded-[var(--radius-control)] bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800">{t.app}</Link>
        <Link prefetch={false} href={`/${l}`} className="inline-flex h-10 items-center px-3 text-sm font-medium text-brand-700 hover:underline">{t.home}</Link>
      </div>
    </div>
  );
}
