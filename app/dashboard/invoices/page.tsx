'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { invoices, invoiceStatusBadgeClass } from '@/lib/mock-data';
import { Search, Download, Plus, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { InvoiceStatus } from '@/lib/types';

const statusOptions: (InvoiceStatus | 'ALL')[] = ['ALL', 'DRAFT', 'ISSUED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');

  const filtered = useMemo(() =>
    invoices.filter(inv => {
      const matchesSearch = inv.invoiceId.toLowerCase().includes(search.toLowerCase()) || inv.customer.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
  , [search, statusFilter]);

  const stats = useMemo(() => ({
    total: invoices.length,
    paid: invoices.filter(i => i.status === 'PAID').length,
    overdue: invoices.filter(i => i.status === 'OVERDUE').length,
    totalOutstanding: invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((s, i) => s + i.total, 0),
  }), []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="الفواتير" description="إدارة الفوترة لعملاء الأعمال">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> تصدير
        </button>
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> إنشاء فاتورة
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الفواتير', value: stats.total, icon: FileText, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'مدفوعة', value: stats.paid, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'متأخرة', value: stats.overdue, icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20' },
          { label: 'المستحقات', value: `${(stats.totalOutstanding / 1000).toFixed(0)}ك دج`, icon: Clock, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
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
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by invoice ID or customer..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as InvoiceStatus | 'ALL')}
          className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
        >
          {statusOptions.map(s => <option key={s} value={s}>{s === 'ALL' ? 'كل الحالات' : s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">رقم الفاتورة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">العميل</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">العناصر</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">المبلغ</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الضريبة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الإجمالي</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الحالة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">تاريخ الاستحقاق</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{inv.invoiceId}</td>
                  <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{inv.customer}</td>
                  <td className="px-3 py-3 hidden md:table-cell text-xs text-muted-foreground">{inv.items.length} عناصر</td>
                  <td className="px-3 py-3 text-foreground whitespace-nowrap">{inv.amount.toLocaleString()}</td>
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{inv.tax.toLocaleString()}</td>
                  <td className="px-3 py-3 font-semibold text-foreground whitespace-nowrap">{inv.total.toLocaleString()}</td>
                  <td className="px-3 py-3"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', invoiceStatusBadgeClass[inv.status])}>{inv.status.replace(/_/g, ' ')}</span></td>
                  <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">{inv.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
