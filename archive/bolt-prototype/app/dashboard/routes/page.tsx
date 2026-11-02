'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { ProgressBar } from '@/components/dashboard/badges';
import { cn } from '@/lib/utils';
import { routes } from '@/lib/mock-data';
import { Search, Navigation, Plus, CheckCircle2, Clock, AlertTriangle, MapPin, Truck, Weight } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  planned: { label: 'Planned', color: 'bg-muted text-muted-foreground', icon: Clock },
  active: { label: 'Active', color: 'bg-primary/15 text-primary', icon: Navigation },
  completed: { label: 'Completed', color: 'bg-success/15 text-success', icon: CheckCircle2 },
  delayed: { label: 'Delayed', color: 'bg-destructive/15 text-destructive', icon: AlertTriangle },
};

export default function RoutesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = useMemo(() =>
    routes.filter(r => {
      const matchesSearch = r.routeId.toLowerCase().includes(search.toLowerCase()) || r.driver.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
  , [search, statusFilter]);

  const stats = useMemo(() => ({
    total: routes.length,
    active: routes.filter(r => r.status === 'active').length,
    completed: routes.filter(r => r.status === 'completed').length,
    totalWeight: Math.round(routes.reduce((s, r) => s + r.collectedWeight, 0) * 10) / 10,
  }), []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Routes" description="Plan and track collection routes across zones">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Plan Route
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Routes', value: stats.total, icon: Navigation, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'Active', value: stats.active, icon: Navigation, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'Collected Weight', value: `${stats.totalWeight}t`, icon: Weight, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by route ID or driver..." className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer">
          <option value="ALL">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="delayed">Delayed</option>
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">Route ID</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Driver</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">Vehicle</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">Zone</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">Stops</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">Distance</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Progress</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const cfg = statusConfig[r.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{r.routeId}</td>
                    <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{r.driver}</td>
                    <td className="px-3 py-3 hidden sm:table-cell"><span className="flex items-center gap-1 text-muted-foreground"><Truck className="w-3.5 h-3.5" />{r.vehicle}</span></td>
                    <td className="px-3 py-3 hidden md:table-cell"><span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{r.zone}</span></td>
                    <td className="px-3 py-3 hidden lg:table-cell text-muted-foreground">{r.stops}</td>
                    <td className="px-3 py-3 hidden lg:table-cell text-muted-foreground">{r.distance}km</td>
                    <td className="px-3 py-3 w-28">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={r.progress} className="w-16" barClassName={r.status === 'completed' ? 'bg-success' : r.status === 'delayed' ? 'bg-destructive' : 'bg-primary'} />
                        <span className="text-xs text-muted-foreground">{r.progress}%</span>
                      </div>
                    </td>
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
