'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { ProgressBar } from '@/components/dashboard/badges';
import { cn } from '@/lib/utils';
import { useCrud } from '@/hooks/use-crud';
import { maintenanceConfig, vehicleConfig } from '@/lib/table-configs';
import type { MaintenanceRecord, Vehicle } from '@/lib/types';
import { Wrench, Truck, Calendar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  in_progress: { label: 'قيد التنفيذ', color: 'bg-primary/15 text-primary', icon: Wrench },
  scheduled: { label: 'مجدول', color: 'bg-info/15 text-info', icon: Calendar },
  completed: { label: 'مكتمل', color: 'bg-success/15 text-success', icon: CheckCircle2 },
};

export default function MaintenancePage() {
  const { data: maintenanceItems, loading: maintLoading, error: maintError } = useCrud<MaintenanceRecord>(maintenanceConfig);
  const { data: vehicles, loading: vehLoading } = useCrud<Vehicle>(vehicleConfig);
  const inProgress = maintenanceItems.filter(m => m.status === 'in_progress');
  const scheduled = maintenanceItems.filter(m => m.status === 'scheduled');
  const completed = maintenanceItems.filter(m => m.status === 'completed');
  const totalCost = maintenanceItems.reduce((s, m) => s + m.cost, 0);
  const maintenanceVehicles = vehicles.filter(v => v.status === 'MAINTENANCE');

  return (
    <div className="space-y-6 animate-fade-in">
      {(maintLoading || vehLoading) && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      {maintError && <div className="text-center py-12 text-destructive text-sm">خطأ: {maintError}</div>}
      <PageHeader title="الصيانة" description="تتبع جداول صيانة المركبات وحالة الورشة" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'قيد التنفيذ', value: inProgress.length, icon: Wrench, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
          { label: 'مجدول', value: scheduled.length, icon: Calendar, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
          { label: 'مكتمل (أوت)', value: completed.length, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'إجمالي التكلفة', value: `${(totalCost / 1000).toFixed(0)}ك دج`, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
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

      {maintenanceVehicles.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold text-foreground mb-1">حالياً في الورشة</h3>
          <p className="text-xs text-muted-foreground mb-4">مركبات تخضع للصيانة</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {maintenanceVehicles.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{v.plate}</div>
                  <div className="text-xs text-muted-foreground">{v.type} · {v.mileage.toLocaleString()}كم</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">سجلات الصيانة</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">المركبة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">النوع</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">الورشة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">البداية</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">الإنجاز المتوقع</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">التكلفة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceItems.map(m => {
                const cfg = statusConfig[m.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{m.vehicle}</td>
                    <td className="px-3 py-3 text-foreground">{m.type}</td>
                    <td className="px-3 py-3 hidden md:table-cell text-muted-foreground">{m.assignedTo}</td>
                    <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">{m.startDate}</td>
                    <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">{m.estCompletion}</td>
                    <td className="px-3 py-3 font-semibold text-foreground whitespace-nowrap">{m.cost.toLocaleString()} دج</td>
                    <td className="px-3 py-3"><span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium w-fit', cfg.color)}><StatusIcon className="w-3 h-3" />{cfg.label}</span></td>
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
