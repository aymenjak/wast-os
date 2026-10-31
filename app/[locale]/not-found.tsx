import Link from "next/link";
import { Illustration } from "@/components/illustrations";

// Rendered without params access; text is trilingual on purpose.
export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <Illustration name="notFound" className="w-64" />
      <p className="num text-4xl font-semibold text-ink-300">404</p>
      <p className="text-ink-700">Page introuvable, Page not found, <span lang="ar">الصفحة غير موجودة</span></p>
      <Link href="/" className="text-sm font-medium text-brand-700 hover:underline">NEXVO</Link>
    </main>
  );
}
