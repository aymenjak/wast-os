import './globals.css';
import type { Metadata } from 'next';
import { Cairo, Tajawal } from 'next/font/google';
import { AuthProvider } from '@/components/auth/auth-provider';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-tajawal',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'وست سيتي أو إس — منصة إدارة النفايات الذكية',
  description:
    'نظام التشغيل لمنظومة نفايات المدينة. يربط المواطنين والبلديات والشركات وسائقي الشاحنات وفرق الميدان ومرافق إعادة التدوير وأساطيل السيارات وإنترنت الأشياء والذكاء الاصطناعي في منصة موحدة.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${tajawal.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
