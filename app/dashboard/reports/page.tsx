'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, PriorityBadge } from '@/components/dashboard/badges';
import {
  citizenReports,
  reportTypeLabels,
  priorityBadgeClass,
  reportStatusBadgeClass,
  formatTimeAgo,
} from '@/lib/mock-data';
import type { ReportStatus, Priority, CitizenReport } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Search, Filter, Download, MapPin, Clock, User, Camera,
  Brain, Star, X, ChevronRight, Plus, Navigation,
} from 'lucide-react';

const statusOptions: (ReportStatus | 'ALL')[] = ['ALL', 'SUBMITTED', 'AI_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
const priorityOptions: (Priority | 'ALL')[] = ['ALL', 'CRITICAL', 'HIGH', 'NORMAL', 'LOW'];

export default function ReportsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [selected, setSelected] = useState<CitizenReport | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [reports, setReports] = useState(citizenReports);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      const matchesSearch = r.reportId.toLowerCase().includes(search.toLowerCase()) ||
        r.location.toLowerCase().includes(search.toLowerCase()) ||
        r.citizenName.toLowerCase().includes(search.toLowerCase()) ||
        reportTypeLabels[r.type].toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || r.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [reports, search, statusFilter, priorityFilter]);

  const counts = useMemo(() => {
    const total = reports.length;
    const resolved = reports.filter(r => r.status === 'RESOLVED').length;
    const active = reports.filter(r => !['RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE'].includes(r.status)).length;
    const critical = reports.filter(r => r.priority === 'CRITICAL').length;
    return { total, resolved, active, critical };
  }, [reports]);

  const updateReportStatus = (id: string, status: ReportStatus) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status, resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : r.resolvedAt } : r));
    setSelected(prev => prev && prev.id === id ? { ...prev, status, resolvedAt: status === 'RESOLVED' ? new Date().toISOString() : prev.resolvedAt } : prev);
  };

  const handleExport = () => {
    const headers = ['رقم البلاغ', 'النوع', 'المواطن', 'الموقع', 'الأولوية', 'الحالة', 'الإرسال'];
    const rows = filtered.map(r => [r.reportId, r.type, r.citizenName, r.location, r.priority, r.status, r.submittedAt]);
    const csv = [headers, ...rows].map(r2 => r2.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="بلاغات المواطنين" description="تتبع وإدارة البلاغات المتعلقة بالنفايات المرسلة من المواطنين">
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> تصدير
        </button>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> بلاغ جديد
        </button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي البلاغات', value: counts.total, color: 'text-foreground', bg: 'bg-card' },
          { label: 'نشطة', value: counts.active, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'تم الحل', value: counts.resolved, color: 'text-success', bg: 'bg-success/5' },
          { label: 'حرجة', value: counts.critical, color: 'text-destructive', bg: 'bg-destructive/5' },
        ].map((s) => (
          <div key={s.label} className={cn('rounded-xl border border-border p-4', s.bg)}>
            <div className={cn('text-2xl font-display font-semibold', s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالرقم، الموقع، المواطن، أو النوع..." className="w-full h-9 pr-9 pl-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'ALL')} className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer">
            {statusOptions.map((s) => (<option key={s} value={s}>{s === 'ALL' ? 'كل الحالات' : s.replace(/_/g, ' ')}</option>))}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as Priority | 'ALL')} className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer">
            {priorityOptions.map((p) => (<option key={p} value={p}>{p === 'ALL' ? 'كل الأولويات' : p}</option>))}
          </select>
        </div>
      </div>

      {/* Reports table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">رقم البلاغ</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">النوع</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">المواطن</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">الموقع</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الأولوية</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الحالة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">الوقت</th>
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm"><Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />لا توجد بلاغات مطابقة للمرشحات</td></tr>
              ) : (
                filtered.map((report) => (
                  <tr key={report.id} onClick={() => setSelected(report)} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group">
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{report.reportId}</td>
                    <td className="px-3 py-3 text-foreground">{reportTypeLabels[report.type]}</td>
                    <td className="px-3 py-3 hidden lg:table-cell text-muted-foreground whitespace-nowrap">{report.citizenName}</td>
                    <td className="px-3 py-3 hidden md:table-cell text-muted-foreground whitespace-nowrap">{report.location}</td>
                    <td className="px-3 py-3"><PriorityBadge label={report.priority} className={priorityBadgeClass[report.priority]} /></td>
                    <td className="px-3 py-3"><StatusBadge label={report.status.replace(/_/g, ' ')} className={reportStatusBadgeClass[report.status]} /></td>
                    <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(report.submittedAt)}</td>
                    <td className="px-3 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
          <span>عرض {filtered.length} من {reports.length} بلاغ</span>
        </div>
      </div>

      {selected && <ReportDrawer report={selected} onClose={() => setSelected(null)} onUpdateStatus={updateReportStatus} onViewMap={() => router.push('/dashboard/dispatch')} />}
      {showCreate && <CreateReportModal onClose={() => setShowCreate(false)} onCreate={(r) => { setReports(prev => [r, ...prev]); }} />}
    </div>
  );
}

function ReportDrawer({ report, onClose, onUpdateStatus, onViewMap }: { report: CitizenReport; onClose: () => void; onUpdateStatus: (id: string, status: ReportStatus) => void; onViewMap: () => void }) {
  const timeline = [
    { label: 'مُرسل', time: report.submittedAt, done: true },
    { label: 'مراجعة الذكاء', time: report.submittedAt, done: !['SUBMITTED'].includes(report.status) },
    { label: 'موثّق', time: report.submittedAt, done: ['VERIFIED', 'ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'RESOLVED'].includes(report.status) },
    { label: 'مُسند', time: report.assignedTeam ? report.submittedAt : '', done: ['ASSIGNED', 'EN_ROUTE', 'IN_PROGRESS', 'RESOLVED'].includes(report.status) },
    { label: 'قيد التنفيذ', time: '', done: ['IN_PROGRESS', 'RESOLVED'].includes(report.status) },
    { label: 'تم الحل', time: report.resolvedAt || '', done: report.status === 'RESOLVED' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed right-0 inset-y-0 w-full sm:max-w-md bg-card border-l border-border z-50 overflow-y-auto scrollbar-thin animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <div className="font-mono text-xs text-muted-foreground">{report.reportId}</div>
            <h2 className="font-display text-lg font-semibold mt-0.5">{reportTypeLabels[report.type]}</h2>
          </div>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <PriorityBadge label={report.priority} className={priorityBadgeClass[report.priority]} />
            <StatusBadge label={report.status.replace(/_/g, ' ')} className={reportStatusBadgeClass[report.status]} />
          </div>

          {report.hasPhoto && (
            <div className="aspect-video rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground">
              <div className="text-center"><Camera className="w-8 h-8 mx-auto mb-1 opacity-40" /><span className="text-xs">صورة من المواطن مرفقة</span></div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={User} label="المواطن" value={report.citizenName} />
            <InfoItem icon={MapPin} label="الموقع" value={report.location} />
            <InfoItem icon={MapPin} label="المنطقة" value={report.zone} />
            <InfoItem icon={Clock} label="الإرسال" value={formatTimeAgo(report.submittedAt)} />
            {report.assignedTeam && <InfoItem icon={User} label="الفريق" value={report.assignedTeam} />}
            {report.estimatedResponse && <InfoItem icon={Clock} label="الاستجابة المتوقعة" value={report.estimatedResponse} />}
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">الوصف</div>
            <p className="text-sm text-foreground leading-relaxed">{report.description}</p>
          </div>

          {report.aiConfidence && (
            <div className="rounded-lg bg-accent/5 border border-accent/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-accent" />
                <span className="text-xs font-medium text-accent">تحليل الذكاء الاصطناعي</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">درجة الثقة</span>
                  <span className="font-medium">{Math.round(report.aiConfidence * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${report.aiConfidence * 100}%` }} />
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-3">الجدول الزمني</div>
            <div className="space-y-3">
              {timeline.map((step, i) => (
                <div key={step.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0', step.done ? 'bg-success border-success' : 'bg-card border-border')}>
                      {step.done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    {i < timeline.length - 1 && <div className={cn('w-0.5 h-6', step.done ? 'bg-success' : 'bg-border')} />}
                  </div>
                  <div className="pt-0.5">
                    <div className={cn('text-sm', step.done ? 'text-foreground font-medium' : 'text-muted-foreground')}>{step.label}</div>
                    {step.time && <div className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(step.time)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {report.rating && (
            <div className="rounded-lg bg-success/5 border border-success/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-success fill-success" />
                <span className="text-xs font-medium text-success">تقييم المواطن</span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('w-4 h-4', i < report.rating! ? 'text-success fill-success' : 'text-muted')} />
                ))}
                <span className="text-sm font-medium ml-2">{report.rating}/5</span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {report.status === 'SUBMITTED' && (
              <button onClick={() => onUpdateStatus(report.id, 'ASSIGNED')} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">توثيق وإسناد</button>
            )}
            {report.status === 'ASSIGNED' && (
              <button onClick={() => onUpdateStatus(report.id, 'IN_PROGRESS')} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">تعيين قيد التنفيذ</button>
            )}
            {report.status === 'IN_PROGRESS' && (
              <button onClick={() => onUpdateStatus(report.id, 'RESOLVED')} className="flex-1 h-9 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-colors">تعيين كمحلول</button>
            )}
            {report.status === 'RESOLVED' && (
              <div className="flex-1 h-9 rounded-lg bg-success/10 text-success text-sm font-medium flex items-center justify-center gap-2">
                <Star className="w-4 h-4 fill-success" /> تم الحل
              </div>
            )}
            <button onClick={onViewMap} className="h-9 px-3 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5" /> عرض على الخريطة
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function CreateReportModal({ onClose, onCreate }: { onClose: () => void; onCreate: (r: CitizenReport) => void }) {
  const [type, setType] = useState('overflowing_container');
  const [priority, setPriority] = useState('NORMAL');
  const [location, setLocation] = useState('');
  const [zone, setZone] = useState('المنطقة 1 — الوسط');
  const [citizenName, setCitizenName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newReport: CitizenReport = {
      id: `r-${Date.now()}`,
      reportId: `WR-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      type: type as CitizenReport['type'],
      status: 'SUBMITTED',
      priority: priority as Priority,
      citizenName,
      location,
      zone,
      lat: 36.7538 + (Math.random() - 0.5) * 0.06,
      lng: 3.0588 + (Math.random() - 0.5) * 0.06,
      description,
      submittedAt: new Date().toISOString(),
      hasPhoto: false,
    };
    onCreate(newReport);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-xl border border-border shadow-xl z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display text-lg font-semibold">بلاغ مواطن جديد</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">النوع</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option value="overflowing_container">حاوية تفيض</option>
                <option value="illegal_dumping">إلقاء غير قانوني</option>
                <option value="missed_collection">جمع فائت</option>
                <option value="damaged_container">حاوية تالفة</option>
                <option value="waste_scattered">نفايات متناثرة</option>
                <option value="large_waste">نفايات كبيرة</option>
                <option value="hazardous_waste">نفايات خطرة</option>
                <option value="bad_smell">رائحة كريهة</option>
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
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">اسم المواطن</label>
            <input type="text" required value={citizenName} onChange={(e) => setCitizenName(e.target.value)} placeholder="اسم المواطن" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">الموقع</label>
            <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="العنوان أو المعلم" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">المنطقة</label>
            <select value={zone} onChange={(e) => setZone(e.target.value)} className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
              <option>المنطقة 1 — الوسط</option><option>المنطقة 2 — الشمال</option><option>المنطقة 3 — الشرق</option><option>المنطقة 4 — الجنوب</option><option>المنطقة 5 — الغرب</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">الوصف</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="صف المشكلة..." className="w-full h-24 p-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">إلغاء</button>
            <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">إرسال البلاغ</button>
          </div>
        </form>
      </div>
    </>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5"><Icon className="w-3 h-3" />{label}</div>
      <div className="text-sm font-medium text-foreground truncate">{value}</div>
    </div>
  );
}
