import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { Locale } from "@/lib/i18n/config";

/**
 * The founding team, as provided by the founders themselves (photos and roles; the biographies and highlights come only from each founder's CV).
 * "compact" for the home page, "full" for the About page. Names are rendered with <bdi> so Latin and Arabic mix safely.
 */
export function Founders({ d, locale, variant }: { d: Dictionary; locale: Locale; variant: "compact" | "full" }) {
  const f = d.founders;
  const people = [
    {
      key: "chahinez", photo: "/team/chahinez-lahlali.jpg", p: f.chahinez, highlights: f.chahinez.highlights.split("|"),
      links: [{ href: "https://www.linkedin.com/in/chahinez-lahlali-b26a96390", label: f.chahinez.linkedin }],
    },
    {
      key: "aymen", photo: "/team/aymen-rouagha.jpg", p: f.aymen, highlights: f.aymen.highlights.split("|"),
      links: [
        { href: "https://www.linkedin.com/in/aymenjak", label: f.aymen.linkedin },
        { href: "https://github.com/aymenjak", label: f.aymen.github },
      ],
    },
  ];

  if (variant === "compact") {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        {people.map(({ key, photo, p }) => (
          <figure key={key} className="flex items-center gap-5 rounded-[var(--radius-card)] border border-ink-200 bg-white p-4 shadow-[var(--shadow-card)]">
            <Image src={photo} alt={p.name} width={640} height={800} sizes="112px" className="h-36 w-28 shrink-0 rounded-[calc(var(--radius-card)-4px)] object-cover" />
            <figcaption className="min-w-0">
              <p className="text-lg font-bold text-ink-900"><bdi>{p.name}</bdi></p>
              <p className="mt-0.5 text-sm font-medium text-brand-800">{p.role}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">{p.short}</p>
            </figcaption>
          </figure>
        ))}
        <div className="sm:col-span-2">
          <Link href={`/${locale}/about#team`} className="text-sm font-semibold text-brand-800 underline underline-offset-4">{f.more}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {people.map(({ key, photo, p, highlights, links }) => (
        <article key={key} className="grid gap-6 sm:grid-cols-[200px_1fr] sm:items-start">
          <Image src={photo} alt={p.name} width={640} height={800} sizes="(min-width: 640px) 200px, 60vw" className="aspect-[4/5] w-48 rounded-[var(--radius-card)] object-cover shadow-[var(--shadow-card)] sm:w-full" />
          <div className="min-w-0">
            <h3 className="text-2xl font-bold text-ink-950"><bdi>{p.name}</bdi></h3>
            <p className="mt-1 font-medium text-brand-800">{p.role}</p>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-700">{p.bio}</p>
            {highlights.length ? (
              <ul className="mt-4 space-y-2 text-sm text-ink-800">
                {highlights.map((h) => <li key={h} className="flex gap-2"><span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-hivis-600" />{h}</li>)}
              </ul>
            ) : null}
            {links.length ? (
              <p className="mt-4 flex flex-wrap gap-4 text-sm">
                {links.map((l) => <a key={l.href} href={l.href} rel="noopener noreferrer" target="_blank" className="font-semibold text-brand-800 underline underline-offset-4">{l.label}</a>)}
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
