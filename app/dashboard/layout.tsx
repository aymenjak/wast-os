'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { TopBar } from '@/components/dashboard/topbar';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { useAuth } from '@/components/auth/auth-provider';
import { Recycle, Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary animate-pulse">
            <Recycle className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            جارٍ تحميل لوحة التحكم...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pr-64">
        <TopBar />
        <main className="p-4 lg:p-6 pb-20 lg:pb-6 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
