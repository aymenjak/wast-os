'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { PriorityBadge } from '@/components/dashboard/badges';
import { cn } from '@/lib/utils';
import { collectionRequests, wasteTypeLabels, priorityBadgeClass } from '@/lib/mock-data';
import { Search, Plus, ClipboardList, Clock, Truck, CheckCircle2, Package } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-warning/15 text-warning' },
  priced: { label: 'Priced', color: 'bg-info/15 text-info' },
  dispatched: { label: 'Dispatched', color: 'bg-primary/15 text-primary' },
  collected: { label: 'Collected', color: 'bg-accent/15 text-accent' },
  completed: { label: 'Completed', color: 'bg-success/15 text-success' },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
};

export default function RequestsPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    collectionRequests.filter(r =>
      r.business.toLowerCase().includes(search.toLowerCase()) ||
      r.requestId.toLowerCase().includes(search.toLowerCase())
    )
  , [search]);

  const stats = useMemo(() => ({
    total: collectionRequests.length,
    pending: collectionRequests.filter(r => r.status === 'pending').length,
    dispatched: collectionRequests.filter(r => r.status === 'dispatched').length,
    completed: collectionRequests.filter(r => r.status === 'completed').length,
  }), []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Collection Requests" description="B2B waste collection requests from businesses">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Requests', value: stats.total, icon: ClipboardList, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
          { label: 'Dispatched', value: stats.dispatched, icon: Truck, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
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
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by business or request ID..."
          className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">Request ID</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Business</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">Waste Type</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Quantity</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Priority</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Status</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">Price</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const cfg = statusConfig[r.status];
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{r.requestId}</td>
                    <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{r.business}</td>
                    <td className="px-3 py-3 hidden md:table-cell text-muted-foreground">{wasteTypeLabels[r.wasteType]}</td>
                    <td className="px-3 py-3 text-foreground whitespace-nowrap">{r.quantity}kg</td>
                    <td className="px-3 py-3"><PriorityBadge label={r.priority} className={priorityBadgeClass[r.priority]} /></td>
                    <td className="px-3 py-3"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', cfg.color)}>{cfg.label}</span></td>
                    <td className="px-3 py-3 hidden lg:table-cell text-foreground whitespace-nowrap">{r.price ? `${r.price.toLocaleString()} DZD` : '—'}</td>
                    <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">{r.preferredDate}</td>
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
