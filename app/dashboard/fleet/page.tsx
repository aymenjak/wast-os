'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, ProgressBar } from '@/components/dashboard/badges';
import { useCrud } from '@/hooks/use-crud';
import { vehicleConfig } from '@/lib/table-configs';
import { vehicleStatusBadgeClass } from '@/lib/mock-data';
import type { Vehicle, VehicleStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Search, Download, Plus, Truck, Fuel, Gauge,
  MapPin, User, Navigation, Wrench, Eye, X,
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

const statusOptions: (VehicleStatus | 'ALL')[] = ['ALL', 'AVAILABLE', 'ON_ROUTE', 'LOADING', 'MAINTENANCE', 'OFFLINE'];

export default function FleetPage() {
  const { data: vehicles, loading, error } = useCrud<Vehicle>(vehicleConfig);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'ALL'>('ALL');
  const [showAdd, setShowAdd] = useState(false);

  const handleExport = () => {
    downloadCSV(
      ['اللوحة', 'النوع', 'السائق', 'الحالة', 'المنطقة', 'الوقود', 'المسافة'],
      filtered.map(v => [v.plate, v.type, v.driver, v.status, v.zone, `${v.fuel}%`, `${v.mileage} كم`]),
      `fleet-${Date.now()}.csv`,
    );
  };

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch = v.plate.toLowerCase().includes(search.toLowerCase()) ||
        v.driver.toLowerCase().includes(search.toLowerCase()) ||
        v.type.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, search, statusFilter]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const onRoute = vehicles.filter(v => v.status === 'ON_ROUTE').length;
    const available = vehicles.filter(v => v.status === 'AVAILABLE').length;
    const maintenance = vehicles.filter(v => v.status === 'MAINTENANCE').length;
    const offline = vehicles.filter(v => v.status === 'OFFLINE').length;
    const avgFuel = total > offline && total > 0 ? Math.round(vehicles.filter(v => v.status !== 'OFFLINE').reduce((sum, v) => sum + v.fuel, 0) / (total - offline)) : 0;
    return { total, onRoute, available, maintenance, offline, avgFuel };
  }, [vehicles]);

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      {error && <div className="text-center py-12 text-destructive text-sm">خطأ: {error}</div>}
      <PageHeader title="إدارة الأسطول" description="مراقبة المركبات والسائقين والوقود والصيانة">
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> تصدير
        </button>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> إضافة مركبة
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي الأسطول', value: stats.total, icon: Truck, iconClass: 'text-foreground', bgClass: 'bg-card', borderClass: 'border-border' },
          { label: 'في الطريق', value: stats.onRoute, icon: Navigation, iconClass: 'text-primary', bgClass: 'bg-primary/5', borderClass: 'border-primary/20' },
          { label: 'متاح', value: stats.available, icon: Truck, iconClass: 'text-success', bgClass: 'bg-success/5', borderClass: 'border-success/20' },
          { label: 'في الصيانة', value: stats.maintenance, icon: Wrench, iconClass: 'text-warning', bgClass: 'bg-warning/5', borderClass: 'border-warning/20' },
          { label: 'متوسط الوقود', value: `${stats.avgFuel}%`, icon: Fuel, iconClass: 'text-info', bgClass: 'bg-info/5', borderClass: 'border-info/20' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-xl border p-4', s.bgClass, s.borderClass)}>
              <div className="flex items-center justify-between mb-1">
                <div className={cn('text-2xl font-display font-semibold', s.iconClass)}>{s.value}</div>
                <Icon className={cn('w-5 h-5', s.iconClass)} />
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by plate, driver, or type..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | 'ALL')}
          className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'كل الحالات' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Vehicle cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => {
          const loadPct = Math.round((v.currentLoad / v.capacity) * 100);
          return (
            <div key={v.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex items-center justify-center w-11 h-11 rounded-lg',
                    v.status === 'ON_ROUTE' ? 'bg-primary/10' :
                    v.status === 'AVAILABLE' ? 'bg-success/10' :
                    v.status === 'MAINTENANCE' ? 'bg-warning/10' :
                    v.status === 'OFFLINE' ? 'bg-muted' :
                    'bg-info/10'
                  )}>
                    <Truck className={cn(
                      'w-5 h-5',
                      v.status === 'ON_ROUTE' ? 'text-primary' :
                      v.status === 'AVAILABLE' ? 'text-success' :
                      v.status === 'MAINTENANCE' ? 'text-warning' :
                      v.status === 'OFFLINE' ? 'text-muted-foreground' :
                      'text-info'
                    )} />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-foreground">{v.plate}</div>
                    <div className="text-xs text-muted-foreground">{v.type}</div>
                  </div>
                </div>
                <StatusBadge label={v.status.replace(/_/g, ' ')} className={vehicleStatusBadgeClass[v.status]} />
              </div>

              <div className="space-y-3">
                {/* Driver */}
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">السائق:</span>
                  <span className="font-medium text-foreground truncate">{v.driver}</span>
                </div>

                {/* Zone */}
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">المنطقة:</span>
                  <span className="font-medium text-foreground">{v.zone}</span>
                </div>

                {/* Load capacity */}
                {v.status !== 'OFFLINE' && v.status !== 'AVAILABLE' && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">سعة الحمل</span>
                      <span className="font-medium">{loadPct}%</span>
                    </div>
                    <ProgressBar
                      value={loadPct}
                      barClassName={loadPct > 90 ? 'bg-destructive' : loadPct > 70 ? 'bg-warning' : 'bg-info'}
                    />
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {(v.currentLoad / 1000).toFixed(1)}t / {(v.capacity / 1000).toFixed(1)}t
                    </div>
                  </div>
                )}

                {/* On route info */}
                {v.status === 'ON_ROUTE' && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted-foreground">التالي:</span>
                      <span className="font-medium text-foreground truncate max-w-[120px]">{v.nextStop}</span>
                    </div>
                    <span className="font-medium text-primary shrink-0">{v.eta}</span>
                  </div>
                )}

                {/* Fuel & mileage */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Fuel className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">الوقود:</span>
                    <span className={cn('font-medium', v.fuel < 40 ? 'text-warning' : 'text-foreground')}>{v.fuel}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{(v.mileage / 1000).toFixed(0)}k km</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <AddVehicleModal onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}

function AddVehicleModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-xl border border-border shadow-xl z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display text-lg font-semibold">إضافة مركبة</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onClose(); }} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">رقم اللوحة</label>
              <input type="text" required placeholder="مثال: 00123-456-12" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">نوع المركبة</label>
              <select className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option>شاحنة ضاغطة</option>
                <option>تحميل جانبي</option>
                <option>تحميل خلفي</option>
                <option>شاحنة رول-أوف</option>
                <option>رافعة خطافية</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">السعة (كغ)</label>
              <input type="number" required placeholder="12000" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">المنطقة</label>
              <select className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option>المنطقة 1 — الوسط</option><option>المنطقة 2 — الشمال</option><option>المنطقة 3 — الشرق</option><option>المنطقة 4 — الجنوب</option><option>المنطقة 5 — الغرب</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">السائق</label>
            <input type="text" required placeholder="اسم السائق" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">إلغاء</button>
            <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">إضافة المركبة</button>
          </div>
        </form>
      </div>
    </>
  );
}
