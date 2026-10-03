'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { businesses } from '@/lib/mock-data';
import {
  Search, Plus, Download, Building2, MapPin, Mail, Phone,
  Recycle, FileText, AlertCircle, CheckCircle2, Clock, XCircle, X,
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

const contractStatusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'نشط', color: 'text-success bg-success/10', icon: CheckCircle2 },
  pending: { label: 'قيد الانتظار', color: 'text-warning bg-warning/10', icon: Clock },
  expired: { label: 'منتهي', color: 'text-destructive bg-destructive/10', icon: XCircle },
  none: { label: 'لا عقد', color: 'text-muted-foreground bg-muted', icon: AlertCircle },
};

export default function BusinessesPage() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<typeof businesses[0] | null>(null);
  const [showRequest, setShowRequest] = useState(false);

  const handleExport = () => {
    downloadCSV(
      ['الاسم', 'الفئة', 'المنطقة', 'حالة العقد', 'الحجم الشهري', 'نسبة إعادة التدوير', 'الرصيد المستحق'],
      filtered.map(b => [b.name, b.category, b.zone, b.contractStatus, `${b.monthlyVolume}طن`, `${b.recyclingRate}%`, b.outstandingBalance]),
      `businesses-${Date.now()}.csv`,
    );
  };

  const filtered = useMemo(() => {
    return businesses.filter(b =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase()) ||
      b.zone.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const stats = useMemo(() => ({
    total: businesses.length,
    activeContracts: businesses.filter(b => b.contractStatus === 'active').length,
    outstanding: businesses.reduce((sum, b) => sum + b.outstandingBalance, 0),
    totalVolume: Math.round(businesses.reduce((sum, b) => sum + b.monthlyVolume, 0) * 10) / 10,
  }), []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="الشركات" description="إدارة عملاء الأعمال والعقود وخدمات الجمع">
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> تصدير
        </button>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> إضافة شركة
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الشركات', value: stats.total, icon: Building2, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'عقود نشطة', value: stats.activeContracts, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'المستحقات', value: `${(stats.outstanding / 1000).toFixed(0)}ك دج`, icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
          { label: 'الحجم الشهري', value: `${stats.totalVolume}طن`, icon: Recycle, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
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
          placeholder="Search by name, category, or zone..."
          className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(b => {
          const cfg = contractStatusConfig[b.contractStatus];
          const StatusIcon = cfg.icon;
          return (
            <div key={b.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/20 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-foreground text-sm">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.category}</div>
                  </div>
                </div>
                <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', cfg.color)}>
                  <StatusIcon className="w-3 h-3" /> {cfg.label}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> {b.address}, {b.zone}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" /> {b.contactEmail}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" /> {b.contactPhone}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50">
                <div>
                  <div className="text-sm font-semibold text-foreground">{b.monthlyVolume}t</div>
                  <div className="text-[10px] text-muted-foreground">شهري</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{b.recyclingRate}%</div>
                  <div className="text-[10px] text-muted-foreground">إعادة التدوير</div>
                </div>
                <div>
                  <div className={cn('text-sm font-semibold', b.outstandingBalance > 0 ? 'text-destructive' : 'text-success')}>
                    {b.outstandingBalance > 0 ? `${(b.outstandingBalance / 1000).toFixed(0)}ك` : 'مدفوع'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">الرصيد</div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button onClick={() => setSelectedBusiness(b)} className="flex-1 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">عرض التفاصيل</button>
                <button onClick={() => { setSelectedBusiness(b); setShowRequest(true); }} className="flex-1 h-8 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">طلب جديد</button>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && <AddBusinessModal onClose={() => setShowAdd(false)} />}
      {selectedBusiness && !showRequest && (
        <BusinessDetailsModal business={selectedBusiness} onClose={() => setSelectedBusiness(null)} onRequest={() => setShowRequest(true)} />
      )}
      {selectedBusiness && showRequest && (
        <RequestModal business={selectedBusiness} onClose={() => { setShowRequest(false); setSelectedBusiness(null); }} />
      )}
    </div>
  );
}

function AddBusinessModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-xl border border-border shadow-xl z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display text-lg font-semibold">إضافة شركة</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onClose(); }} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">اسم الشركة</label>
              <input type="text" required placeholder="اسم الشركة" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">الفئة</label>
              <select className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option>مطعم</option><option>تجزئة</option><option>صناعي</option><option>مكتب</option><option>مستشفى</option><option>ضيافة</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">العنوان</label>
            <input type="text" required placeholder="عنوان الشارع" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">البريد الإلكتروني</label>
              <input type="email" required placeholder="contact@business.dz" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">الهاتف</label>
              <input type="tel" required placeholder="+213 ..." className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">إلغاء</button>
            <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">إضافة الشركة</button>
          </div>
        </form>
      </div>
    </>
  );
}

function BusinessDetailsModal({ business, onClose, onRequest }: { business: typeof businesses[0]; onClose: () => void; onRequest: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-xl border border-border shadow-xl z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display text-lg font-semibold">{business.name}</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-xs text-muted-foreground mb-0.5">الفئة</div><div className="text-sm font-medium">{business.category}</div></div>
            <div><div className="text-xs text-muted-foreground mb-0.5">المنطقة</div><div className="text-sm font-medium">{business.zone}</div></div>
            <div><div className="text-xs text-muted-foreground mb-0.5">جهة الاتصال</div><div className="text-sm font-medium">{business.contactName}</div></div>
            <div><div className="text-xs text-muted-foreground mb-0.5">الهاتف</div><div className="text-sm font-medium">{business.contactPhone}</div></div>
            <div><div className="text-xs text-muted-foreground mb-0.5">البريد</div><div className="text-sm font-medium">{business.contactEmail}</div></div>
            <div><div className="text-xs text-muted-foreground mb-0.5">المواقع</div><div className="text-sm font-medium">{business.locations}</div></div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
            <div className="text-center"><div className="text-lg font-semibold">{business.monthlyVolume}t</div><div className="text-[10px] text-muted-foreground">الحجم الشهري</div></div>
            <div className="text-center"><div className="text-lg font-semibold">{business.recyclingRate}%</div><div className="text-[10px] text-muted-foreground">نسبة إعادة التدوير</div></div>
            <div className="text-center"><div className="text-lg font-semibold">{business.containers}</div><div className="text-[10px] text-muted-foreground">الحاويات</div></div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">إغلاق</button>
            <button onClick={onRequest} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">طلب جمع جديد</button>
          </div>
        </div>
      </div>
    </>
  );
}

function RequestModal({ business, onClose }: { business: typeof businesses[0]; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-xl border border-border shadow-xl z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display text-lg font-semibold">طلب جديد — {business.name}</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onClose(); }} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">نوع النفايات</label>
              <select className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option>عامة</option><option>عضوية</option><option>بلاستيك</option><option>ورق</option><option>زجاج</option><option>معدن</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">الكمية (كغ)</label>
              <input type="number" required placeholder="500" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">التاريخ المفضل</label>
            <input type="date" required className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">ملاحظات</label>
            <textarea placeholder="تفاصيل إضافية..." className="w-full h-24 p-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">إلغاء</button>
            <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">إرسال الطلب</button>
          </div>
        </form>
      </div>
    </>
  );
}
