'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, ProgressBar } from '@/components/dashboard/badges';
import {
  wasteTypeLabels, containerStatusBadgeClass,
  getFillLevelBg, getFillLevelColor, formatTimeAgo,
} from '@/lib/mock-data';
import type { ContainerStatus, Container } from '@/lib/types';
import { containerConfig } from '@/lib/table-configs';
import { useCrud } from '@/hooks/use-crud';
import { cn } from '@/lib/utils';
import {
  Search, Download, Plus, Trash2, QrCode, MapPin,
  Wifi, Battery, AlertTriangle, Filter, X,
} from 'lucide-react';

function downloadCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const statusOptions: (ContainerStatus | 'ALL')[] = ['ALL', 'ACTIVE', 'FULL', 'DAMAGED', 'MAINTENANCE'];
const fillBuckets = [
  { label: 'حرج (>90%)', color: 'bg-destructive', filter: (f: number) => f >= 90 },
  { label: 'مرتفع (70-89%)', color: 'bg-warning', filter: (f: number) => f >= 70 && f < 90 },
  { label: 'متوسط (40-69%)', color: 'bg-info', filter: (f: number) => f >= 40 && f < 70 },
  { label: 'منخفض (<40%)', color: 'bg-success', filter: (f: number) => f < 40 },
];

export default function ContainersPage() {
  const { data: containers, loading, error } = useCrud<Container>(containerConfig);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContainerStatus | 'ALL'>('ALL');
  const [showRegister, setShowRegister] = useState(false);

  const handleExport = () => {
    downloadCSV(
      ['رقم الحاوية', 'النوع', 'نوع النفايات', 'الموقع', 'المنطقة', 'مستوى الامتلاء', 'الحالة', 'مستشعر'],
      filtered.map(c => [c.containerId, c.type, c.wasteType, c.location, c.zone, `${c.fillLevel}%`, c.status, c.hasSensor ? 'نعم' : 'لا']),
      `containers-${Date.now()}.csv`,
    );
  };

  const filtered = useMemo(() => {
    if (!containers) return [];
    return containers.filter((c) => {
      const matchesSearch = c.containerId.toLowerCase().includes(search.toLowerCase()) ||
        c.location.toLowerCase().includes(search.toLowerCase()) ||
        c.zone.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [containers, search, statusFilter]);

  const stats = useMemo(() => {
    if (!containers || containers.length === 0) return { total: 0, active: 0, full: 0, damaged: 0, withSensors: 0, avgFill: 0 };
    const total = containers.length;
    const active = containers.filter(c => c.status === 'ACTIVE').length;
    const full = containers.filter(c => c.status === 'FULL').length;
    const damaged = containers.filter(c => c.status === 'DAMAGED').length;
    const withSensors = containers.filter(c => c.hasSensor).length;
    const avgFill = Math.round(containers.reduce((sum, c) => sum + c.fillLevel, 0) / containers.length);
    return { total, active, full, damaged, withSensors, avgFill };
  }, [containers]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="الحاويات" description="مراقبة مستوى امتلاء الحاويات وحالتها وصيانتها">
          <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium opacity-50" disabled>
            <Download className="w-4 h-4" /> تصدير
          </button>
          <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium opacity-50" disabled>
            <Plus className="w-4 h-4" /> تسجيل
          </button>
        </PageHeader>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 bg-card animate-pulse">
              <div className="h-7 w-16 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded mt-2" />
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
        <PageHeader title="الحاويات" description="مراقبة مستوى امتلاء الحاويات وحالتها وصيانتها" />
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm font-medium text-destructive">فشل تحميل الحاويات</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      {error && <div className="text-center py-12 text-destructive text-sm">خطأ: {error}</div>}
      <PageHeader title="الحاويات" description="مراقبة مستوى امتلاء الحاويات وحالتها وصيانتها">
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> تصدير
        </button>
        <button onClick={() => setShowRegister(true)} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> تسجيل
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الحاويات', value: stats.total, sub: `${stats.withSensors} بمستشعرات`, icon: Trash2, iconClass: 'text-foreground', bgClass: 'bg-card', borderClass: 'border-border' },
          { label: 'نشطة', value: stats.active, sub: 'تشغيلية', icon: Trash2, iconClass: 'text-success', bgClass: 'bg-success/5', borderClass: 'border-success/20' },
          { label: 'ممتلئة / تحتاج جمع', value: stats.full, sub: 'اهتمام عاجل', icon: AlertTriangle, iconClass: 'text-warning', bgClass: 'bg-warning/5', borderClass: 'border-warning/20' },
          { label: 'متوسط الامتلاء', value: `${stats.avgFill}%`, sub: 'عبر جميع الحاويات', icon: Battery, iconClass: 'text-info', bgClass: 'bg-info/5', borderClass: 'border-info/20' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-xl border p-4', s.bgClass, s.borderClass)}>
              <div className="flex items-center justify-between mb-1">
                <div className={cn('text-2xl font-display font-semibold', s.iconClass)}>{s.value}</div>
                <Icon className={cn('w-5 h-5', s.iconClass)} />
              </div>
              <div className="text-xs font-medium text-foreground">{s.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Fill distribution */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">توزيع مستوى الامتلاء</h3>
        <div className="flex h-4 rounded-full overflow-hidden">
          {fillBuckets.map((bucket) => {
            const count = containers ? containers.filter(c => bucket.filter(c.fillLevel)).length : 0;
            const pct = containers && containers.length ? (count / containers.length) * 100 : 0;
            return (
              <div
                key={bucket.label}
                className={bucket.color}
                style={{ width: `${pct}%` }}
                title={`${bucket.label}: ${count} containers`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          {fillBuckets.map((bucket) => {
            const count = containers ? containers.filter(c => bucket.filter(c.fillLevel)).length : 0;
            return (
              <div key={bucket.label} className="flex items-center gap-1.5">
                <span className={cn('w-2.5 h-2.5 rounded-sm', bucket.color)} />
                <span className="text-muted-foreground">{bucket.label}</span>
                <span className="font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, location, or zone..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContainerStatus | 'ALL')}
          className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'كل الحالات' : s}</option>
          ))}
        </select>
      </div>

      {/* Container cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
            لا توجد حاويات مطابقة للمرشحات
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">{c.containerId}</div>
                  <div className="text-sm font-medium text-foreground mt-0.5">{c.type}</div>
                </div>
                <StatusBadge label={c.status} className={containerStatusBadgeClass[c.status]} />
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">مستوى الامتلاء</span>
                    <span className={cn('font-medium', getFillLevelColor(c.fillLevel))}>{c.fillLevel}%</span>
                  </div>
                  <ProgressBar
                    value={c.fillLevel}
                    barClassName={getFillLevelBg(c.fillLevel)}
                  />
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">النوع:</span>
                  <span className="font-medium">{wasteTypeLabels[c.wasteType]}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{c.location}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {c.hasSensor ? (
                      <span className="flex items-center gap-1 text-info">
                        <Wifi className="w-3 h-3" /> IoT
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Wifi className="w-3 h-3 opacity-40" /> بدون مستشعر
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground">{formatTimeAgo(c.lastCollection)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showRegister && (
        <RegisterContainerModal onClose={() => setShowRegister(false)} />
      )}
    </div>
  );
}

function RegisterContainerModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-xl border border-border shadow-xl z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display text-lg font-semibold">تسجيل حاوية</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onClose(); }} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">نوع الحاوية</label>
              <select className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option>حاوية قياسية</option>
                <option>حاوية كبيرة</option>
                <option>تحت الأرض</option>
                <option>حاوية جرسية</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">السعة (لتر)</label>
              <input type="number" required placeholder="1200" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">نوع النفايات</label>
              <select className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option>عامة</option><option>عضوية</option><option>بلاستيك</option><option>ورق</option><option>زجاج</option><option>معدن</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">المنطقة</label>
              <select className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option>المنطقة 1 — الوسط</option><option>المنطقة 2 — الشمال</option><option>المنطقة 3 — الشرق</option><option>المنطقة 4 — الجنوب</option><option>المنطقة 5 — الغرب</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">الموقع</label>
            <input type="text" required placeholder="العنوان أو المعلم" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="hasSensor" className="rounded" />
            <label htmlFor="hasSensor" className="text-sm text-muted-foreground">مزودة بمستشعر إنترنت الأشياء</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">إلغاء</button>
            <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">تسجيل</button>
          </div>
        </form>
      </div>
    </>
  );
}
