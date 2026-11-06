import { Illustration } from "@/components/illustrations";
import { NotFoundActions } from "@/components/not-found-actions";

// Rendered without params access; text is trilingual on purpose.
export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <Illustration name="notFound" className="w-64" />
      <p className="num text-4xl font-semibold text-ink-500">404</p>
      <h1 className="text-ink-800">Page introuvable, Page not found, <span lang="ar">الصفحة غير موجودة</span></h1>
      <NotFoundActions />
    </main>
  );
}
