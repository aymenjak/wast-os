'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { drivers } from '@/lib/mock-data';
import { Search, Users, Star, Truck, Clock, MapPin, Phone } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-success/15 text-success' },
  on_route: { label: 'On Route', color: 'bg-primary/15 text-primary' },
  off_duty: { label: 'Off Duty', color: 'bg-muted text-muted-foreground' },
  on_leave: { label: 'On Leave', color: 'bg-warning/15 text-warning' },
};

export default function DriversPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.assignedVehicle.toLowerCase().includes(search.toLowerCase()))
  , [search]);

  const stats = useMemo(() => ({
    total: drivers.length,
    onRoute: drivers.filter(d => d.status === 'on_route').length,
    available: drivers.filter(d => d.status === 'available').length,
    avgRating: (drivers.reduce((s, d) => s + d.rating, 0) / drivers.length).toFixed(1),
  }), []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Drivers" description="Manage driver assignments, schedules, and performance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Drivers', value: stats.total, icon: Users, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'On Route', value: stats.onRoute, icon: Truck, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
          { label: 'Available', value: stats.available, icon: Users, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'Avg Rating', value: stats.avgRating, icon: Star, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or vehicle..." className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(d => {
          const cfg = statusConfig[d.status];
          return (
            <div key={d.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-white text-sm font-semibold">
                    {d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-display font-semibold text-foreground text-sm">{d.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Truck className="w-3 h-3" />{d.assignedVehicle}</div>
                  </div>
                </div>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', cfg.color)}>{cfg.label}</span>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" />{d.phone}</div>
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{d.zone}</div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" />{d.hoursThisWeek}h this week</div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-sm font-semibold text-warning"><Star className="w-3.5 h-3.5 fill-warning" />{d.rating}</div>
                  <div className="text-[10px] text-muted-foreground">Rating</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{d.completedRoutes}</div>
                  <div className="text-[10px] text-muted-foreground">Routes</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground font-mono">{d.license}</div>
                  <div className="text-[10px] text-muted-foreground">License</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
