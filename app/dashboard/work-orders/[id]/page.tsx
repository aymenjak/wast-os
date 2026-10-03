'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, PriorityBadge, ProgressBar } from '@/components/dashboard/badges';
import {
  workOrders, vehicles, drivers, citizenReports,
  priorityBadgeClass, reportStatusBadgeClass, formatTimeAgo,
} from '@/lib/mock-data';
import type { WorkOrderStatus, SLAStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CityMap, type MapEntity } from '@/components/dashboard/city-map';
import {
  ArrowLeft, Download, Clock, AlertTriangle, CheckCircle2,
  Truck, User, MapPin, FileText, Phone, Navigation,
  Calendar, Wrench, Camera, Brain, Activity,
} from 'lucide-react';

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

const statusFlow: WorkOrderStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const wo = useMemo(() => workOrders.find(w => w.id === id), [id]);

  const [currentStatus, setCurrentStatus] = useState<WorkOrderStatus | null>(null);
  const [currentProgress, setCurrentProgress] = useState<number | null>(null);
  const [assignedTeam, setAssignedTeam] = useState<string | undefined>(undefined);
  const [assignedVehicle, setAssignedVehicle] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [activityLog, setActivityLog] = useState<{ action: string; time: string }[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const displayStatus = currentStatus ?? wo?.status ?? 'OPEN';
  const displayProgress = currentProgress ?? wo?.progress ?? 0;
  const displayTeam = assignedTeam ?? wo?.assignedTeam;
  const displayVehicle = assignedVehicle ?? wo?.assignedVehicle;

  const relatedReport = useMemo(() => {
    if (!wo || wo.type !== 'citizen_complaint') return null;
    return citizenReports.find(r => r.location === wo.location && r.zone === wo.zone) || null;
  }, [wo]);

  const mapEntities: MapEntity[] = useMemo(() => {
    if (!wo) return [];
    const entities: MapEntity[] = [];

    // Work order location (use related report coords or default city center + offset)
    const lat = relatedReport?.lat ?? 36.7538 + (Math.random() - 0.5) * 0.06;
    const lng = relatedReport?.lng ?? 3.0588 + (Math.random() - 0.5) * 0.06;
    entities.push({
      id: 'wo-location',
      lat,
      lng,
      type: 'report',
      label: wo.orderId,
      details: [
        { label: 'النوع', value: wo.type.replace(/_/g, ' ') },
        { label: 'الموقع', value: wo.location },
        { label: 'الأولوية', value: wo.priority },
        { label: 'الحالة', value: displayStatus.replace(/_/g, ' ') },
      ],
    });

    // Nearby trucks
    vehicles.filter(v => v.status === 'ON_ROUTE' || v.status === 'AVAILABLE').slice(0, 3).forEach(v => {
      entities.push({
        id: v.id,
        lat: v.lat,
        lng: v.lng,
        type: 'truck',
        label: v.plate,
        details: [
          { label: 'السائق', value: v.driver },
          { label: 'الحالة', value: v.status.replace(/_/g, ' ') },
          { label: 'المنطقة', value: v.zone },
        ],
      });
    });

    return entities;
  }, [wo, relatedReport, displayStatus]);

  if (!wo) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <FileText className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="font-display text-lg font-semibold mb-2">أمر العمل غير موجود</h2>
        <p className="text-sm text-muted-foreground mb-4">قد يكون هذا الأمر قد حُذف.</p>
        <Link href="/dashboard/work-orders" className="flex items-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <ArrowLeft className="w-4 h-4" /> العودة لأوامر العمل
        </Link>
      </div>
    );
  }

  const logAction = (action: string) => {
    setActivityLog(prev => [{ action, time: new Date().toISOString() }, ...prev]);
  };

  const advanceStatus = () => {
    const currentIndex = statusFlow.indexOf(displayStatus);
    if (currentIndex < statusFlow.length - 1) {
      const next = statusFlow[currentIndex + 1];
      setCurrentStatus(next);
      if (next === 'IN_PROGRESS') setCurrentProgress(Math.max(displayProgress, 25));
      if (next === 'COMPLETED') setCurrentProgress(100);
      logAction(`Status changed to ${next.replace(/_/g, ' ')}`);
    }
  };

  const updateProgress = (val: number) => {
    setCurrentProgress(val);
    if (val === 100 && displayStatus !== 'COMPLETED') {
      setCurrentStatus('COMPLETED');
      logAction('Marked as completed (progress 100%)');
    } else if (val > 0 && displayStatus === 'OPEN') {
      setCurrentStatus('ASSIGNED');
      logAction('Status changed to Assigned');
    }
  };

  const handleAssign = (team: string, vehicle: string) => {
    setAssignedTeam(team);
    setAssignedVehicle(vehicle);
    setShowAssignModal(false);
    if (displayStatus === 'OPEN') {
      setCurrentStatus('ASSIGNED');
      logAction(`Assigned to ${team} with vehicle ${vehicle}`);
    } else {
      logAction(`Reassigned to ${team} with vehicle ${vehicle}`);
    }
  };

  const timeline = [
    { label: 'تم الإنشاء', done: true, time: wo.createdAt },
    { label: 'تم الإسناد', done: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(displayStatus), time: '' },
    { label: 'قيد التنفيذ', done: ['IN_PROGRESS', 'COMPLETED'].includes(displayStatus), time: '' },
    { label: 'مكتمل', done: displayStatus === 'COMPLETED', time: displayStatus === 'COMPLETED' ? new Date().toISOString() : '' },
  ];

  const availableDrivers = drivers.slice(0, 6);
  const availableVehicles = vehicles.filter(v => v.status === 'AVAILABLE' || v.status === 'ON_ROUTE').slice(0, 6);
  const woLat = relatedReport?.lat ?? 36.7538;
  const woLng = relatedReport?.lng ?? 3.0588;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={wo.orderId}
        description={wo.type.replace(/_/g, ' ')}
      >
        <button
          onClick={() => router.push('/dashboard/work-orders')}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> رجوع
        </button>
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> تصدير
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'الحالة', value: displayStatus.replace(/_/g, ' '), icon: Clock },
              { label: 'الأولوية', value: wo.priority, icon: AlertTriangle },
              { label: 'الخدمة', value: wo.slaStatus.replace(/_/g, ' '), icon: Activity },
              { label: 'التقدم', value: `${displayProgress}%`, icon: CheckCircle2 },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-lg font-display font-semibold">{s.value}</div>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Details card */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">تفاصيل أمر العمل</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <DetailItem icon={MapPin} label="الموقع" value={wo.location} />
              <DetailItem icon={MapPin} label="المنطقة" value={wo.zone} />
              <DetailItem icon={Calendar} label="الإنشاء" value={new Date(wo.createdAt).toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' })} />
              <DetailItem icon={Clock} label="الاستحقاق" value={new Date(wo.dueTime).toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' })} />
              <DetailItem icon={User} label="الفريق المُسند" value={displayTeam || 'غير مُسند'} />
              <DetailItem icon={Truck} label="المركبة المُسندة" value={displayVehicle || 'لا يوجد'} />
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">الوصف</div>
              <p className="text-sm text-foreground leading-relaxed">{wo.description}</p>
            </div>
          </div>

          {/* Progress control */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-foreground">التقدم والحالة</h3>
              <div className="flex gap-2">
                {displayStatus !== 'COMPLETED' && displayStatus !== 'CANCELLED' && (
                  <button
                    onClick={advanceStatus}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {displayStatus === 'OPEN' ? 'بدء العمل' : displayStatus === 'ASSIGNED' ? 'بدء التنفيذ' : 'تعيين كمكتمل'}
                  </button>
                )}
                {displayStatus === 'OPEN' && (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-warning/10 text-warning border border-warning/20 text-xs font-medium hover:bg-warning/20 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" /> تعيين فريق
                  </button>
                )}
                {displayStatus !== 'COMPLETED' && displayStatus !== 'CANCELLED' && (
                  <button
                    onClick={() => { setCurrentStatus('CANCELLED'); logAction('Work order cancelled'); }}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">التقدم</span>
                <span className="font-medium">{displayProgress}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={displayProgress}
                onChange={(e) => updateProgress(Number(e.target.value))}
                className="w-full h-2 rounded-full bg-muted appearance-none cursor-pointer accent-primary"
              />
              <ProgressBar
                value={displayProgress}
                className="mt-2"
                barClassName={displayStatus === 'COMPLETED' ? 'bg-success' : displayStatus === 'OVERDUE' ? 'bg-destructive' : 'bg-primary'}
              />
            </div>

            {/* Timeline */}
            <div className="space-y-3 mt-4">
              {timeline.map((step, i) => (
                <div key={step.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                      step.done ? 'bg-success border-success' : 'bg-card border-border'
                    )}>
                      {step.done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    {i < timeline.length - 1 && (
                      <div className={cn('w-0.5 h-6', step.done ? 'bg-success' : 'bg-border')} />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <div className={cn('text-sm', step.done ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                      {step.label}
                    </div>
                    {step.time && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(step.time)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity log */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">سجل النشاط</h3>
            <div className="space-y-3">
              {activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا يوجد نشاط بعد. ستظهر التغييرات التي تقوم بها هنا.</p>
              ) : (
                activityLog.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{entry.action}</p>
                      <span className="text-[10px] text-muted-foreground">{formatTimeAgo(entry.time)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column - map, related, notes */}
        <div className="space-y-6">
          {/* Map */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-display font-semibold text-foreground mb-3">خريطة الموقع</h3>
            <CityMap
              entities={mapEntities}
              center={[woLat, woLng]}
              zoom={14}
              height="300px"
            />
          </div>

          {/* Related citizen report */}
          {relatedReport && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-display font-semibold text-foreground mb-3">بلاغ المواطن المرتبط</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{relatedReport.reportId}</span>
                  <StatusBadge label={relatedReport.status.replace(/_/g, ' ')} className={reportStatusBadgeClass[relatedReport.status]} />
                </div>
                <p className="text-sm text-foreground leading-relaxed">{relatedReport.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">المواطن:</span> <span className="font-medium">{relatedReport.citizenName}</span></div>
                  <div><span className="text-muted-foreground">الأولوية:</span> <span className="font-medium">{relatedReport.priority}</span></div>
                </div>
                {relatedReport.aiConfidence && (
                  <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-3.5 h-3.5 text-accent" />
                      <span className="text-xs font-medium text-accent">ثقة الذكاء: {Math.round(relatedReport.aiConfidence * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${relatedReport.aiConfidence * 100}%` }} />
                    </div>
                  </div>
                )}
                <Link
                  href="/dashboard/reports"
                  className="block text-center text-xs text-primary hover:underline font-medium pt-1"
                >
                  عرض كل البلاغات ←
                </Link>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold text-foreground mb-3">ملاحظات داخلية</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات داخلية للفريق..."
              className="w-full h-24 p-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors resize-none"
            />
            <button
              onClick={() => { if (notes.trim()) { logAction(`Note added: ${notes.trim().slice(0, 50)}...`); setNotes(''); } }}
              className="w-full mt-2 h-8 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              حفظ الملاحظة
            </button>
          </div>

          {/* Quick actions */}
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-display font-semibold text-foreground mb-3">إجراءات سريعة</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowAssignModal(true)}
                className="w-full flex items-center gap-2 px-3 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                <User className="w-4 h-4 text-muted-foreground" /> {displayTeam ? 'إعادة تعيين الفريق' : 'تعيين فريق'}
              </button>
              <Link
                href="/dashboard/dispatch"
                className="w-full flex items-center gap-2 px-3 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                <Navigation className="w-4 h-4 text-muted-foreground" /> عرض على خريطة الإرسال
              </Link>
              <Link
                href="/dashboard/fleet"
                className="w-full flex items-center gap-2 px-3 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                <Truck className="w-4 h-4 text-muted-foreground" /> فحص حالة الأسطول
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Assign modal */}
      {showAssignModal && (
        <AssignModal
          drivers={availableDrivers.map(d => d.name)}
          vehicles={availableVehicles.map(v => `${v.plate} (${v.type})`)}
          onAssign={handleAssign}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function AssignModal({
  drivers,
  vehicles,
  onAssign,
  onClose,
}: {
  drivers: string[];
  vehicles: string[];
  onAssign: (team: string, vehicle: string) => void;
  onClose: () => void;
}) {
  const [selectedDriver, setSelectedDriver] = useState(drivers[0] || '');
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0] || '');

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-xl border border-border shadow-xl z-50 animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display text-lg font-semibold">تعيين الفريق والمركبة</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-sm">إغلاق</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">السائق / الفريق</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
            >
              {drivers.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">المركبة</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
            >
              {vehicles.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <button
            onClick={() => onAssign(selectedDriver, selectedVehicle)}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            تأكيد التعيين
          </button>
        </div>
      </div>
    </>
  );
}
