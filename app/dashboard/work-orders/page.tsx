'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, PriorityBadge, ProgressBar } from '@/components/dashboard/badges';
import {
  priorityBadgeClass, slaStatusClass, formatTimeAgo,
} from '@/lib/mock-data';
import type { WorkOrderStatus, SLAStatus, WorkOrder } from '@/lib/types';
import { workOrderConfig } from '@/lib/table-configs';
import { useCrud } from '@/hooks/use-crud';
import { cn } from '@/lib/utils';
import {
  Search, Download, Plus, Clock, AlertTriangle,
  CheckCircle2, Truck, ChevronRight, X,
} from 'lucide-react';

const statusOptions: (WorkOrderStatus | 'ALL')[] = ['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];
const slaOptions: (SLAStatus | 'ALL')[] = ['ALL', 'ON_TRACK', 'AT_RISK', 'BREACHED'];

const statusBadgeClass: Record<WorkOrderStatus, string> = {
  OPEN: 'bg-muted text-muted-foreground',
  ASSIGNED: 'bg-warning/15 text-warning',
  IN_PROGRESS: 'bg-primary/15 text-primary',
  COMPLETED: 'bg-success/15 text-success',
  CANCELLED: 'bg-muted text-muted-foreground',
  OVERDUE: 'bg-destructive/15 text-destructive',
};

const slaBadgeClass: Record<SLAStatus, string> = {
  ON_TRACK: 'bg-success/10 text-success border-success/20',
  AT_RISK: 'bg-warning/10 text-warning border-warning/20',
  BREACHED: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function WorkOrdersPage() {
  const router = useRouter();
  const { data: workOrders, loading, error } = useCrud<WorkOrder>(workOrderConfig);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'ALL'>('ALL');
  const [slaFilter, setSlaFilter] = useState<SLAStatus | 'ALL'>('ALL');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    if (!workOrders) return [];
    return workOrders.filter((w) => {
      const matchesSearch = w.orderId.toLowerCase().includes(search.toLowerCase()) ||
        w.location.toLowerCase().includes(search.toLowerCase()) ||
        w.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
      const matchesSla = slaFilter === 'ALL' || w.slaStatus === slaFilter;
      return matchesSearch && matchesStatus && matchesSla;
    });
  }, [workOrders, search, statusFilter, slaFilter]);

  const stats = useMemo(() => {
    if (!workOrders) return { open: 0, inProgress: 0, completed: 0, breaches: 0, atRisk: 0, total: 0 };
    const open = workOrders.filter(w => w.status === 'OPEN').length;
    const inProgress = workOrders.filter(w => w.status === 'IN_PROGRESS').length;
    const completed = workOrders.filter(w => w.status === 'COMPLETED').length;
    const breaches = workOrders.filter(w => w.slaStatus === 'BREACHED').length;
    const atRisk = workOrders.filter(w => w.slaStatus === 'AT_RISK').length;
    return { open, inProgress, completed, breaches, atRisk, total: workOrders.length };
  }, [workOrders]);

  const handleExport = () => {
    const headers = ['رقم الأمر', 'النوع', 'الموقع', 'الأولوية', 'الحالة', 'الخدمة', 'التقدم', 'الاستحقاق'];
    const rows = filtered.map(w => [
      w.orderId, w.type, w.location, w.priority, w.status, w.slaStatus, `${w.progress}%`,
      new Date(w.dueTime).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-orders-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="أوامر العمل" description="إدارة وتتبع جميع أوامر العمل التشغيلية عبر المدينة">
          <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium opacity-50" disabled>
            <Download className="w-4 h-4" /> تصدير
          </button>
          <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium opacity-50" disabled>
            <Plus className="w-4 h-4" /> إنشاء أمر
          </button>
        </PageHeader>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 bg-card animate-pulse">
              <div className="h-7 w-16 bg-muted rounded" />
              <div className="h-3 w-20 bg-muted rounded mt-2" />
            </div>
          ))}
        </div>
        <div className="bg-card rounded-xl border border-border p-5 animate-pulse">
          <div className="h-4 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="أوامر العمل" description="إدارة وتتبع جميع أوامر العمل التشغيلية عبر المدينة" />
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm font-medium text-destructive">فشل تحميل أوامر العمل</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      {error && <div className="text-center py-12 text-destructive text-sm">خطأ: {error}</div>}
      <PageHeader title="أوامر العمل" description="إدارة وتتبع جميع أوامر العمل التشغيلية عبر المدينة">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" /> تصدير
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> إنشاء أمر
        </button>
      </PageHeader>

      {/* SLA Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, icon: Clock, iconClass: 'text-foreground', bgClass: 'bg-card', borderClass: 'border-border' },
          { label: 'مفتوح', value: stats.open, icon: Clock, iconClass: 'text-muted-foreground', bgClass: 'bg-muted/30', borderClass: 'border-border' },
          { label: 'قيد التنفيذ', value: stats.inProgress, icon: Truck, iconClass: 'text-primary', bgClass: 'bg-primary/5', borderClass: 'border-primary/20' },
          { label: 'مكتمل', value: stats.completed, icon: CheckCircle2, iconClass: 'text-success', bgClass: 'bg-success/5', borderClass: 'border-success/20' },
          { label: 'اختراقات الخدمة', value: stats.breaches, icon: AlertTriangle, iconClass: 'text-destructive', bgClass: 'bg-destructive/5', borderClass: 'border-destructive/20' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-xl border p-4', s.bgClass, s.borderClass)}>
              <div className="flex items-center justify-between mb-2">
                <div className={cn('text-2xl font-display font-semibold', s.iconClass)}>{s.value}</div>
                <Icon className={cn('w-5 h-5', s.iconClass)} />
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* SLA warning banner */}
      {(stats.breaches > 0 || stats.atRisk > 0) && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 p-4">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-warning">{stats.breaches} اختراق لمستوى الخدمة</span>
            <span className="text-muted-foreground"> و </span>
            <span className="font-medium text-warning">{stats.atRisk} معرض للخطر</span>
            <span className="text-muted-foreground"> — يتطلب اهتماماً فورياً</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, location, or description..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkOrderStatus | 'ALL')}
            className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'كل الحالات' : s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={slaFilter}
            onChange={(e) => setSlaFilter(e.target.value as SLAStatus | 'ALL')}
            className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
          >
            {slaOptions.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'كل مستويات الخدمة' : s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">رقم الأمر</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">النوع</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">الموقع</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الأولوية</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الحالة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الخدمة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">التقدم</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">الاستحقاق</th>
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                    لا توجد أوامر عمل مطابقة للمرشحات
                  </td>
                </tr>
              ) : (
                filtered.map((wo) => (
                  <tr
                    key={wo.id}
                    onClick={() => router.push(`/dashboard/work-orders/${wo.id}`)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{wo.orderId}</td>
                    <td className="px-3 py-3 text-foreground capitalize whitespace-nowrap">{wo.type.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-3 hidden md:table-cell text-muted-foreground whitespace-nowrap">{wo.location}</td>
                    <td className="px-3 py-3">
                      <PriorityBadge label={wo.priority} className={priorityBadgeClass[wo.priority]} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge label={wo.status.replace(/_/g, ' ')} className={statusBadgeClass[wo.status]} />
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                        slaBadgeClass[wo.slaStatus]
                      )}>
                        {wo.slaStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={wo.progress}
                          className="w-20"
                          barClassName={
                            wo.status === 'COMPLETED' ? 'bg-success' :
                            wo.status === 'OVERDUE' ? 'bg-destructive' :
                            'bg-primary'
                          }
                        />
                        <span className="text-xs text-muted-foreground w-8">{wo.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(wo.dueTime).toLocaleString('ar-DZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-3">
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
          <span>عرض {filtered.length} من {workOrders?.length ?? 0} أمر عمل</span>
        </div>
      </div>

      {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateOrderModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [type, setType] = useState('citizen_complaint');
  const [priority, setPriority] = useState('NORMAL');
  const [location, setLocation] = useState('');
  const [zone, setZone] = useState('المنطقة 1 — الوسط');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app this would call the API; for now we just close and go to the list
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-xl border border-border shadow-xl z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display text-lg font-semibold">إنشاء أمر عمل</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">النوع</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option value="citizen_complaint">شكوى مواطن</option>
                <option value="b2b_collection">جمع أعمال</option>
                <option value="container_maintenance">صيانة حاوية</option>
                <option value="emergency_cleanup">تنظيف طارئ</option>
                <option value="scheduled_route">مسار مجدول</option>
                <option value="illegal_dumping">إلقاء غير قانوني</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">الأولوية</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option value="CRITICAL">حرج</option>
                <option value="HIGH">عالي</option>
                <option value="NORMAL">عادي</option>
                <option value="LOW">منخفض</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">الموقع</label>
            <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="مثال: 12 شارع ديدوش مراد" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">المنطقة</label>
            <select value={zone} onChange={(e) => setZone(e.target.value)} className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
              <option>المنطقة 1 — الوسط</option>
              <option>المنطقة 2 — الشمال</option>
              <option>المنطقة 3 — الشرق</option>
              <option>المنطقة 4 — الجنوب</option>
              <option>المنطقة 5 — الغرب</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">الوصف</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="صف العمل المطلوب إنجازه..." className="w-full h-24 p-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">إلغاء</button>
            <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">إنشاء الأمر</button>
          </div>
        </form>
      </div>
    </>
  );
}
