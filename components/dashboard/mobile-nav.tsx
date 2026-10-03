'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Map, Trash2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { label: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
  { label: 'البلاغات', href: '/dashboard/reports', icon: ClipboardList },
  { label: 'الخريطة', href: '/dashboard/dispatch', icon: Map },
  { label: 'الحاويات', href: '/dashboard/containers', icon: Trash2 },
  { label: 'الإحصائيات', href: '/dashboard/analytics', icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around h-16 bg-background/90 backdrop-blur-md border-t border-border">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-colors',
              active ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
