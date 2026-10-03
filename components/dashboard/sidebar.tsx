'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ClipboardList, Map, Trash2, Recycle,
  Truck, BarChart3, Bot, Settings, ShieldCheck, Bell,
  Building2, FileText, CreditCard, Package, Store,
  Users, Route, Scale, ArrowRightLeft,
  ScrollText, Wrench, Navigation, MapPin, Trophy,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: 'الرئيسية',
    items: [
      { label: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard },
      { label: 'الخريطة المباشرة', href: '/dashboard/dispatch', icon: Map },
    ],
  },
  {
    label: 'العمليات',
    items: [
      { label: 'بلاغات المواطنين', href: '/dashboard/reports', icon: ClipboardList, badge: '234' },
      { label: 'أوامر العمل', href: '/dashboard/work-orders', icon: Bell, badge: '40' },
      { label: 'المسارات', href: '/dashboard/routes', icon: Navigation },
      { label: 'الحاويات', href: '/dashboard/containers', icon: Trash2 },
    ],
  },
  {
    label: 'تدفق النفايات',
    items: [
      { label: 'الجمع', href: '/dashboard/collections', icon: Recycle },
      { label: 'الميزان', href: '/dashboard/weighbridge', icon: Scale },
      { label: 'محطات التحويل', href: '/dashboard/transfer-stations', icon: ArrowRightLeft },
    ],
  },
  {
    label: 'إعادة التدوير',
    items: [
      { label: 'مراكز إعادة التدوير', href: '/dashboard/recycling', icon: Recycle },
      { label: 'المواد والمخزون', href: '/dashboard/materials', icon: Package },
      { label: 'السوق', href: '/dashboard/marketplace', icon: Store },
    ],
  },
  {
    label: 'الأسطول',
    items: [
      { label: 'المركبات', href: '/dashboard/fleet', icon: Truck },
      { label: 'السائقون', href: '/dashboard/drivers', icon: Users },
      { label: 'الصيانة', href: '/dashboard/maintenance', icon: Wrench },
    ],
  },
  {
    label: 'الأعمال',
    items: [
      { label: 'الشركات', href: '/dashboard/businesses', icon: Building2 },
      { label: 'العقود', href: '/dashboard/contracts', icon: FileText },
      { label: 'طلبات الجمع', href: '/dashboard/requests', icon: ClipboardList },
      { label: 'الفواتير', href: '/dashboard/invoices', icon: FileText },
      { label: 'المدفوعات', href: '/dashboard/payments', icon: CreditCard },
    ],
  },
  {
    label: 'المواطن',
    items: [
      { label: 'نقاط البيئة', href: '/dashboard/eco-points', icon: Trophy },
    ],
  },
  {
    label: 'التحليلات',
    items: [
      { label: 'الإحصائيات', href: '/dashboard/analytics', icon: BarChart3 },
      { label: 'مساعد الذكاء', href: '/dashboard/ai', icon: Bot },
    ],
  },
  {
    label: 'الإدارة',
    items: [
      { label: 'الاشتراكات', href: '/dashboard/subscriptions', icon: CreditCard },
      { label: 'المستخدمون والصلاحيات', href: '/dashboard/users', icon: ShieldCheck },
      { label: 'سجل التدقيق', href: '/dashboard/audit', icon: ScrollText },
      { label: 'الإعدادات', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-sidebar text-sidebar-foreground fixed inset-y-0 right-0 z-40 border-l border-white/5">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 h-16 border-b border-white/5 transition-colors hover:bg-white/5 shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-accent">
          <Recycle className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-display font-semibold text-white text-sm tracking-tight">NEXVO</div>
          <div className="text-[10px] text-white/40 tracking-wider">منصة إدارة النفايات الذكية</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="px-3 mb-1.5 text-[10px] font-medium text-white/30 tracking-wider">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                      active
                        ? 'bg-sidebar-accent/20 text-white shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', active && 'text-sidebar-accent')} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded',
                        active ? 'bg-sidebar-accent/30 text-white' : 'bg-white/10 text-white/50'
                      )}>
                        {item.badge}
                      </span>
                    )}
                    {active && <div className="w-1 h-1 rounded-full bg-sidebar-accent" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-sidebar-accent/30">
            <MapPin className="w-4 h-4 text-sidebar-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">وسط الجزائر</div>
            <div className="text-[10px] text-white/40 truncate">ولاية الجزائر · المناطق 1-5</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
