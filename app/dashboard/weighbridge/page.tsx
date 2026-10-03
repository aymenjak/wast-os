'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { weighbridgeTransactions, wasteTypeLabels, formatTimeAgo } from '@/lib/mock-data';
import { Search, Scale, Plus, Truck, Weight, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  entered: { label: 'دخل', color: 'bg-muted text-muted-foreground' },
  weighed: { label: 'تم الوزن', color: 'bg-info/15 text-info' },
  completed: { label: 'مكتمل', color: 'bg-success/15 text-success' },
};

export default function WeighbridgePage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    weighbridgeTransactions.filter(t =>
      t.ticketId.toLowerCase().includes(search.toLowerCase()) ||
      t.vehicle.toLowerCase().includes(search.toLowerCase()) ||
      t.driver.toLowerCase().includes(search.toLowerCase())
    )
  , [search]);

  const stats = useMemo(() => ({
    total: weighbridgeTransactions.length,
    totalNet: weighbridgeTransactions.reduce((s, t) => s + t.netWeight, 0),
    completed: weighbridgeTransactions.filter(t => t.status === 'completed').length,
    pending: weighbridgeTransactions.filter(t => t.status !== 'completed').length,
  }), []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="الميزان" description="تسجيل وتتبع عمليات وزن المركبات">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> وزن جديد
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'عمليات اليوم', value: stats.total, icon: Scale, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'إجمالي الوزن الصافي', value: `${(stats.totalNet / 1000).toFixed(1)}طن`, icon: Weight, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
          { label: 'مكتمل', value: stats.completed, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'قيد الانتظار', value: stats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
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
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث برقم التذكرة، المركبة، أو السائق..." className="w-full h-9 pr-9 pl-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">رقم التذكرة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">المركبة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">السائق</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الإجمالي</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الطرا</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الصافي</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">نوع النفايات</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden xl:table-cell">الوجهة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الحالة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const cfg = statusConfig[t.status];
                return (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{t.ticketId}</td>
                    <td className="px-3 py-3"><span className="flex items-center gap-1 text-foreground"><Truck className="w-3.5 h-3.5 text-muted-foreground" />{t.vehicle}</span></td>
                    <td className="px-3 py-3 hidden md:table-cell text-muted-foreground whitespace-nowrap">{t.driver}</td>
                    <td className="px-3 py-3 text-foreground whitespace-nowrap">{t.grossWeight.toLocaleString()}kg</td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{t.tareWeight.toLocaleString()}kg</td>
                    <td className="px-3 py-3 font-semibold text-foreground whitespace-nowrap">{t.netWeight.toLocaleString()}kg</td>
                    <td className="px-3 py-3 hidden lg:table-cell text-muted-foreground">{wasteTypeLabels[t.wasteType]}</td>
                    <td className="px-3 py-3 hidden xl:table-cell"><span className="flex items-center gap-1 text-muted-foreground"><ArrowRight className="w-3 h-3" />{t.destination}</span></td>
                    <td className="px-3 py-3"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', cfg.color)}>{cfg.label}</span></td>
                    <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(t.timestamp)}</td>
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
