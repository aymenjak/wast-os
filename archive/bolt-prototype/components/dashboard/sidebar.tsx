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
    label: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Live Map', href: '/dashboard/dispatch', icon: Map },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Citizen Reports', href: '/dashboard/reports', icon: ClipboardList, badge: '234' },
      { label: 'Work Orders', href: '/dashboard/work-orders', icon: Bell, badge: '40' },
      { label: 'Routes', href: '/dashboard/routes', icon: Navigation },
      { label: 'Containers', href: '/dashboard/containers', icon: Trash2 },
    ],
  },
  {
    label: 'Waste Flow',
    items: [
      { label: 'Collections', href: '/dashboard/collections', icon: Recycle },
      { label: 'Weighbridge', href: '/dashboard/weighbridge', icon: Scale },
      { label: 'Transfer Stations', href: '/dashboard/transfer-stations', icon: ArrowRightLeft },
    ],
  },
  {
    label: 'Recycling',
    items: [
      { label: 'Recycling Centers', href: '/dashboard/recycling', icon: Recycle },
      { label: 'Materials & Inventory', href: '/dashboard/materials', icon: Package },
      { label: 'Marketplace', href: '/dashboard/marketplace', icon: Store },
    ],
  },
  {
    label: 'Fleet',
    items: [
      { label: 'Vehicles', href: '/dashboard/fleet', icon: Truck },
      { label: 'Drivers', href: '/dashboard/drivers', icon: Users },
      { label: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
    ],
  },
  {
    label: 'B2B',
    items: [
      { label: 'Businesses', href: '/dashboard/businesses', icon: Building2 },
      { label: 'Contracts', href: '/dashboard/contracts', icon: FileText },
      { label: 'Collection Requests', href: '/dashboard/requests', icon: ClipboardList },
      { label: 'Invoices', href: '/dashboard/invoices', icon: FileText },
      { label: 'Payments', href: '/dashboard/payments', icon: CreditCard },
    ],
  },
  {
    label: 'Citizen',
    items: [
      { label: 'Eco Points', href: '/dashboard/eco-points', icon: Trophy },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { label: 'AI Copilot', href: '/dashboard/ai', icon: Bot },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users & Roles', href: '/dashboard/users', icon: ShieldCheck },
      { label: 'Audit Logs', href: '/dashboard/audit', icon: ScrollText },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 border-r border-white/5">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 h-16 border-b border-white/5 transition-colors hover:bg-white/5 shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-accent">
          <Recycle className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-display font-semibold text-white text-sm tracking-tight">WASTE CITY OS</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Smart Waste Platform</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="px-3 mb-1.5 text-[10px] font-medium text-white/30 uppercase tracking-wider">
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
            <div className="text-xs font-medium text-white truncate">Alger Centre</div>
            <div className="text-[10px] text-white/40 truncate">Wilaya d&apos;Alger · Zone 1-5</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
