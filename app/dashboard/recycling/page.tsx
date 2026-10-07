'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { recyclerCenters } from '@/lib/mock-data';
import { Recycle, MapPin, Package, TrendingUp, Percent } from 'lucide-react';

export default function RecyclingPage() {
  const stats = {
    totalCapacity: recyclerCenters.reduce((s, c) => s + c.capacity, 0),
    totalIncoming: recyclerCenters.reduce((s, c) => s + c.incomingToday, 0),
    totalRecovered: recyclerCenters.reduce((s, c) => s + c.recoveredToday, 0),
    avgEfficiency: Math.round(recyclerCenters.reduce((s, c) => s + c.efficiency, 0) / recyclerCenters.length),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Recycling Centers" description="Monitor incoming waste, processing, and material recovery" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Capacity', value: `${stats.totalCapacity}t`, icon: Package, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'Incoming Today', value: `${stats.totalIncoming}t`, icon: Recycle, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
          { label: 'Recovered Today', value: `${stats.totalRecovered}t`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'Avg Efficiency', value: `${stats.avgEfficiency}%`, icon: Percent, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
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
                <div className="text-xs text-muted-foreground">Incoming</div>
                <div className="font-semibold text-foreground">{c.incomingToday}t</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Processed</div>
                <div className="font-semibold text-foreground">{c.processedToday}t</div>
              </div>
              <div className="rounded-lg bg-success/5 p-3">
                <div className="text-xs text-muted-foreground">Recovered</div>
                <div className="font-semibold text-success">{c.recoveredToday}t</div>
              </div>
              <div className="rounded-lg bg-destructive/5 p-3">
                <div className="text-xs text-muted-foreground">Rejects</div>
                <div className="font-semibold text-destructive">{c.rejectsToday}t</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50">
              <div className="text-xs text-muted-foreground mb-1.5">Materials handled</div>
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
