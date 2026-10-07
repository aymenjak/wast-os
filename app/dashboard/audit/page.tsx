'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { auditLogs, formatTimeAgo } from '@/lib/mock-data';
import { Search, ScrollText, Edit, Plus, Shield, ArrowRightLeft, CreditCard, Settings, type LucideIcon } from 'lucide-react';

const actionIcons: Record<string, LucideIcon> = {
  INVOICE_MODIFIED: Edit,
  WORKORDER_REASSIGNED: ArrowRightLeft,
  USER_PERMISSION_CHANGED: Shield,
  USER_CREATED: Plus,
  CONTRACT_MODIFIED: Edit,
  REPORT_CLOSED: Edit,
  PAYMENT_RECORDED: CreditCard,
  VEHICLE_ASSIGNED: ArrowRightLeft,
  SLA_CONFIG_CHANGED: Settings,
  ROUTE_OPTIMIZED: ArrowRightLeft,
};

const actionColors: Record<string, string> = {
  INVOICE_MODIFIED: 'text-warning',
  WORKORDER_REASSIGNED: 'text-info',
  USER_PERMISSION_CHANGED: 'text-destructive',
  USER_CREATED: 'text-success',
  CONTRACT_MODIFIED: 'text-warning',
  REPORT_CLOSED: 'text-muted-foreground',
  PAYMENT_RECORDED: 'text-success',
  VEHICLE_ASSIGNED: 'text-info',
  SLA_CONFIG_CHANGED: 'text-destructive',
  ROUTE_OPTIMIZED: 'text-primary',
};

export default function AuditPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    auditLogs.filter(l =>
      l.user.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entityId.toLowerCase().includes(search.toLowerCase())
    )
  , [search]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Audit Logs" description="Track all sensitive actions with full traceability" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: auditLogs.length, icon: ScrollText, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'Modifications', value: auditLogs.filter(l => l.action.includes('MODIFIED') || l.action.includes('CHANGED')).length, icon: Edit, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
          { label: 'Creations', value: auditLogs.filter(l => l.action.includes('CREATED')).length, icon: Plus, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'Permission Changes', value: auditLogs.filter(l => l.action.includes('PERMISSION') || l.action.includes('SLA')).length, icon: Shield, color: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20' },
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
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user, action, or entity..." className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">Action</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">User</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">Entity</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">Before</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">After</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">IP</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => {
                const ActionIcon = actionIcons[log.action] || ScrollText;
                const color = actionColors[log.action] || 'text-muted-foreground';
                return (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <span className={cn('flex items-center gap-2 font-mono text-xs', color)}>
                        <ActionIcon className="w-3.5 h-3.5" />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{log.user}</td>
                    <td className="px-3 py-3 hidden md:table-cell text-xs text-muted-foreground">{log.entity} <span className="font-mono">{log.entityId}</span></td>
                    <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground font-mono">{log.beforeValue || '—'}</td>
                    <td className="px-3 py-3 hidden lg:table-cell text-xs text-foreground font-mono">{log.afterValue || '—'}</td>
                    <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground font-mono">{log.ip}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(log.timestamp)}</td>
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
