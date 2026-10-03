'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { contracts } from '@/lib/mock-data';
import { Search, Plus, FileText, CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'نشط', color: 'text-success bg-success/10', icon: CheckCircle2 },
  expiring: { label: 'ينتهي قريباً', color: 'text-warning bg-warning/10', icon: AlertTriangle },
  expired: { label: 'منتهي', color: 'text-destructive bg-destructive/10', icon: XCircle },
  pending: { label: 'قيد الانتظار', color: 'text-info bg-info/10', icon: Clock },
};

export default function ContractsPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    contracts.filter(c => c.customer.toLowerCase().includes(search.toLowerCase()) || c.contractId.toLowerCase().includes(search.toLowerCase()))
  , [search]);

  const stats = useMemo(() => ({
    total: contracts.length,
    active: contracts.filter(c => c.status === 'active').length,
    expiring: contracts.filter(c => c.status === 'expiring').length,
    monthlyRevenue: contracts.filter(c => c.status === 'active').reduce((s, c) => s + c.monthlyPrice, 0),
  }), []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="العقود" description="إدارة عقود الخدمة مع عملاء الأعمال">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> عقد جديد
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي العقود', value: stats.total, icon: FileText, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'نشط', value: stats.active, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'ينتهي قريباً', value: stats.expiring, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
          { label: 'الإيراد الشهري', value: `${(stats.monthlyRevenue / 1000).toFixed(0)}ك دج`, icon: FileText, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-xl border p-4', s.bg, s.border)}>
              <div className="flex items-center justify-between mb-1">
                <div className={cn('text-2xl font-display font-semibold', s.color)}>{s.value}</div>
                <Icon className={cn('w-5 h-5', s.color)} />
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by customer or contract ID..."
          className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">رقم العقد</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">العميل</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">أنواع النفايات</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">التكرار</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">السعر الشهري</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الحالة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">تاريخ الانتهاء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const cfg = statusConfig[c.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{c.contractId}</td>
                    <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{c.customer}</td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {c.wasteTypes.slice(0, 3).map(w => (
                          <span key={w} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{w}</span>
                        ))}
                        {c.wasteTypes.length > 3 && <span className="text-[10px] text-muted-foreground">+{c.wasteTypes.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell text-muted-foreground">{c.frequency}</td>
                    <td className="px-3 py-3 font-semibold text-foreground whitespace-nowrap">{(c.monthlyPrice / 1000).toFixed(0)}ك دج</td>
                    <td className="px-3 py-3">
                      <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium w-fit', cfg.color)}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">{c.endDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
