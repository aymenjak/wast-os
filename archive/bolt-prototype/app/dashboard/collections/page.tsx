'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { monthlyCollection, zones, wasteByType } from '@/lib/mock-data';
import { Recycle, TrendingUp, Calendar, MapPin, Trash2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CollectionsPage() {
  const totalCollected = monthlyCollection.reduce((s, m) => s + m.collected, 0);
  const totalRecycled = monthlyCollection.reduce((s, m) => s + m.recycled, 0);
  const totalLandfilled = monthlyCollection.reduce((s, m) => s + m.landfilled, 0);
  const recyclingRate = Math.round((totalRecycled / totalCollected) * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Collections" description="Track waste collection operations, volumes, and schedules" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Collected (8mo)', value: `${(totalCollected / 1000).toFixed(1)}kt`, icon: Trash2, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'Recycled', value: `${(totalRecycled / 1000).toFixed(1)}kt`, icon: Recycle, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'Landfilled', value: `${(totalLandfilled / 1000).toFixed(1)}kt`, icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
          { label: 'Recycling Rate', value: `${recyclingRate}%`, icon: BarChart3, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
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

      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-display font-semibold text-foreground mb-1">Monthly Collection Trends</h3>
        <p className="text-xs text-muted-foreground mb-4">Collected vs recycled vs landfilled (tons)</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyCollection}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
            <YAxis className="text-xs" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="collected" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="recycled" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="landfilled" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold text-foreground mb-1">Zone Performance</h3>
          <p className="text-xs text-muted-foreground mb-4">Collection volume by zone (tons)</p>
          <div className="space-y-3">
            {zones.map(z => (
              <div key={z.zone}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5 text-foreground"><MapPin className="w-3.5 h-3.5 text-muted-foreground" />{z.zone}</span>
                  <span className="font-medium text-foreground">{z.wasteCollected}t</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(z.wasteCollected / 487) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold text-foreground mb-1">Waste Type Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Collected tons by category</p>
          <div className="space-y-3">
            {wasteByType.map(w => (
              <div key={w.type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground">{w.type}</span>
                  <span className="font-medium text-foreground">{w.tons}t</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(w.tons / 580) * 100}%`, backgroundColor: w.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-display font-semibold text-foreground mb-1">Upcoming Collections</h3>
        <p className="text-xs text-muted-foreground mb-4">Scheduled collection routes for this week</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { day: 'Today', time: '08:00', zone: 'Zone 1 — Centre', truck: 'TC-014', status: 'In Progress' },
            { day: 'Today', time: '10:30', zone: 'Zone 4 — Sud', truck: 'TC-007', status: 'Scheduled' },
            { day: 'Tomorrow', time: '07:00', zone: 'Zone 2 — Nord', truck: 'TC-003', status: 'Scheduled' },
            { day: 'Tomorrow', time: '09:00', zone: 'Zone 5 — Ouest', truck: 'TC-021', status: 'Scheduled' },
            { day: 'Sat', time: '08:00', zone: 'Zone 3 — Est', truck: 'TC-011', status: 'Scheduled' },
            { day: 'Sat', time: '11:00', zone: 'Zone 1 — Centre', truck: 'TC-014', status: 'Scheduled' },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 shrink-0">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{c.day} · {c.time}</div>
                <div className="text-xs text-muted-foreground truncate">{c.zone}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Truck {c.truck}</div>
              </div>
              <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', c.status === 'In Progress' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
