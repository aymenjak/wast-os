'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { useCrud } from '@/hooks/use-crud';
import { paymentConfig } from '@/lib/table-configs';
import type { Payment } from '@/lib/types';
import { Search, Download, CreditCard, CheckCircle2, Clock, XCircle } from 'lucide-react';

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  completed: { color: 'text-success bg-success/10', icon: CheckCircle2 },
  pending: { color: 'text-warning bg-warning/10', icon: Clock },
  failed: { color: 'text-destructive bg-destructive/10', icon: XCircle },
};

export default function PaymentsPage() {
  const { data: payments, loading, error } = useCrud<Payment>(paymentConfig);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    payments.filter(p => p.paymentId.toLowerCase().includes(search.toLowerCase()) || p.customer.toLowerCase().includes(search.toLowerCase()))
  , [payments, search]);

  const stats = useMemo(() => ({
    total: payments.length,
    completed: payments.filter(p => p.status === 'completed').length,
    pending: payments.filter(p => p.status === 'pending').length,
    totalCollected: payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0),
  }), [payments]);

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      {error && <div className="text-center py-12 text-destructive text-sm">خطأ: {error}</div>}
      <PageHeader title="المدفوعات" description="تتبع المدفوعات المستلمة من عملاء الأعمال">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> تصدير
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المدفوعات', value: stats.total, icon: CreditCard, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'مكتملة', value: stats.completed, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'قيد الانتظار', value: stats.pending, icon: Clock, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
          { label: 'المحصّل', value: `${(stats.totalCollected / 1000).toFixed(0)}ك دج`, icon: CreditCard, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
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
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by payment ID or customer..."
          className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">رقم الدفعة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الفاتورة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">العميل</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">المبلغ</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">الطريقة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">التاريخ</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const cfg = statusConfig[p.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{p.paymentId}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{p.invoiceRef}</td>
                    <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{p.customer}</td>
                    <td className="px-3 py-3 font-semibold text-foreground whitespace-nowrap">{p.amount.toLocaleString()} دج</td>
                    <td className="px-3 py-3 hidden sm:table-cell text-muted-foreground">{p.method}</td>
                    <td className="px-3 py-3 hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">{p.date}</td>
                    <td className="px-3 py-3"><span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium w-fit', cfg.color)}><StatusIcon className="w-3 h-3" /> {p.status === 'completed' ? 'مكتملة' : p.status === 'pending' ? 'قيد الانتظار' : 'فاشلة'}</span></td>
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
