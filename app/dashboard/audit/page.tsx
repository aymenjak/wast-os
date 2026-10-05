'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { useCrud } from '@/hooks/use-crud';
import { auditConfig } from '@/lib/table-configs';
import { formatTimeAgo } from '@/lib/mock-data';
import type { AuditLogEntry } from '@/lib/types';
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
  const { data: auditLogs, loading, error } = useCrud<AuditLogEntry>(auditConfig);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    auditLogs.filter(l =>
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entityId.toLowerCase().includes(search.toLowerCase())
    )
  , [auditLogs, search]);

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      {error && <div className="text-center py-12 text-destructive text-sm">خطأ: {error}</div>}
      <PageHeader title="سجلات التدقيق" description="تتبع جميع الإجراءات الحساسة بتتبع كامل" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الأحداث', value: auditLogs.length, icon: ScrollText, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'تعديلات', value: auditLogs.filter(l => l.action.includes('MODIFIED') || l.action.includes('CHANGED')).length, icon: Edit, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
          { label: 'إنشاءات', value: auditLogs.filter(l => l.action.includes('CREATED')).length, icon: Plus, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'تغييرات الصلاحيات', value: auditLogs.filter(l => l.action.includes('PERMISSION') || l.action.includes('SLA')).length, icon: Shield, color: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20' },
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
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالمستخدم، الإجراء، أو الكيان..." className="w-full h-9 pr-9 pl-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">الإجراء</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">المستخدم</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">الكيان</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">قبل</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">بعد</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">IP</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الوقت</th>
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
                    <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{log.userName}</td>
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
