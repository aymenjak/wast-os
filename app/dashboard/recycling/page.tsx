'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { useCrud } from '@/hooks/use-crud';
import { recyclerConfig } from '@/lib/table-configs';
import type { RecyclerCenter } from '@/lib/types';
import { Recycle, MapPin, Package, TrendingUp, Percent } from 'lucide-react';

export default function RecyclingPage() {
  const { data: recyclerCenters, loading, error } = useCrud<RecyclerCenter>(recyclerConfig);
  const stats = {
    totalCapacity: recyclerCenters.reduce((s, c) => s + c.capacity, 0),
    totalIncoming: recyclerCenters.reduce((s, c) => s + c.incomingToday, 0),
    totalRecovered: recyclerCenters.reduce((s, c) => s + c.recoveredToday, 0),
    avgEfficiency: recyclerCenters.length > 0 ? Math.round(recyclerCenters.reduce((s, c) => s + c.efficiency, 0) / recyclerCenters.length) : 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      {error && <div className="text-center py-12 text-destructive text-sm">خطأ: {error}</div>}
      <PageHeader title="مراكز إعادة التدوير" description="مراقبة النفايات الواردة والمعالجة واسترجاع المواد" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي السعة', value: `${stats.totalCapacity}طن`, icon: Package, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'وارد اليوم', value: `${stats.totalIncoming}طن`, icon: Recycle, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
          { label: 'مسترجع اليوم', value: `${stats.totalRecovered}طن`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'متوسط الكفاءة', value: `${stats.avgEfficiency}%`, icon: Percent, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {recyclerCenters.map(c => (
          <div key={c.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10">
                  <Recycle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-display font-semibold text-foreground text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{c.zone}</div>
                </div>
              </div>
              <span className="text-2xl font-display font-semibold text-success">{c.efficiency}%</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">وارد</div>
                <div className="font-semibold text-foreground">{c.incomingToday}طن</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">معالج</div>
                <div className="font-semibold text-foreground">{c.processedToday}طن</div>
              </div>
              <div className="rounded-lg bg-success/5 p-3">
                <div className="text-xs text-muted-foreground">مسترجع</div>
                <div className="font-semibold text-success">{c.recoveredToday}طن</div>
              </div>
              <div className="rounded-lg bg-destructive/5 p-3">
                <div className="text-xs text-muted-foreground">مرفوض</div>
                <div className="font-semibold text-destructive">{c.rejectsToday}طن</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="text-xs text-muted-foreground mb-1.5">المواد المعالجة</div>
              <div className="flex flex-wrap gap-1">
                {c.materials.map(m => (
                  <span key={m} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
