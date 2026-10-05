'use client';

import { StatCard } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, PriorityBadge, ProgressBar } from '@/components/dashboard/badges';
import { useCrud } from '@/hooks/use-crud';
import { kpiConfig, zoneConfig, wasteTypeConfig, monthlyConfig, activityConfig, reportConfig, workOrderConfig, vehicleConfig } from '@/lib/table-configs';
import { priorityBadgeClass, reportStatusBadgeClass } from '@/lib/mock-data';
import type { KpiData, ZoneData, WasteByTypeData, MonthlyCollectionData, ActivityFeedItem, CitizenReport, WorkOrder, Vehicle } from '@/lib/types';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Activity, AlertTriangle, FileText, Truck, Clock,
  MapPin, ArrowUpRight, Zap, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const activityIcons: Record<string, LucideIcon> = {
  report: FileText,
  workorder: Clock,
  collection: Truck,
  alert: AlertTriangle,
  vehicle: Truck,
  invoice: FileText,
};

const activityColors: Record<string, string> = {
  report: 'text-info bg-info/10',
  workorder: 'text-primary bg-primary/10',
  collection: 'text-success bg-success/10',
  alert: 'text-warning bg-warning/10',
  vehicle: 'text-muted-foreground bg-muted',
  invoice: 'text-chart-4 bg-chart-4/10',
};

export default function DashboardPage() {
  const { data: kpiData, loading: kpiLoading } = useCrud<KpiData>(kpiConfig);
  const { data: zones, loading: zoneLoading } = useCrud<ZoneData>(zoneConfig);
  const { data: wasteByType, loading: wasteLoading } = useCrud<WasteByTypeData>(wasteTypeConfig);
  const { data: monthlyCollection, loading: monthlyLoading } = useCrud<MonthlyCollectionData>(monthlyConfig);
  const { data: activityFeed, loading: actLoading } = useCrud<ActivityFeedItem>(activityConfig);
  const { data: citizenReports, loading: repLoading } = useCrud<CitizenReport>(reportConfig);
  const { data: workOrders, loading: woLoading } = useCrud<WorkOrder>(workOrderConfig);
  const { data: vehicles, loading: vehLoading } = useCrud<Vehicle>(vehicleConfig);
  const loading = kpiLoading || zoneLoading || wasteLoading || monthlyLoading || actLoading || repLoading || woLoading || vehLoading;

  const activeReports = citizenReports.filter(r => !['RESOLVED', 'CLOSED', 'REJECTED', 'DUPLICATE'].includes(r.status)).length;
  const activeWorkOrders = workOrders.filter(w => !['COMPLETED', 'CANCELLED'].includes(w.status)).length;
  const activeVehicles = vehicles.filter(v => v.status === 'ON_ROUTE' || v.status === 'LOADING').length;
  const criticalReports = citizenReports.filter(r => r.priority === 'CRITICAL').length;
  const slaBreaches = workOrders.filter(w => w.slaStatus === 'BREACHED').length;

  const alertItems = [
    { label: 'بلاغات حرجة', value: criticalReports, icon: AlertTriangle, iconClass: 'text-destructive', bgClass: 'bg-destructive/10' },
    { label: 'أوامر عمل نشطة', value: activeWorkOrders, icon: Clock, iconClass: 'text-primary', bgClass: 'bg-primary/10' },
    { label: 'شاحنات في الطريق', value: activeVehicles, icon: Truck, iconClass: 'text-info', bgClass: 'bg-info/10' },
    { label: 'اختراقات مستوى الخدمة', value: slaBreaches, icon: Zap, iconClass: 'text-warning', bgClass: 'bg-warning/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      <PageHeader
        title="مركز القيادة"
        description="نظرة عامة لحظية على عمليات منظومة نفايات المدينة"
      >
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-success/10 text-success text-sm font-medium">
          <span className="relative w-2 h-2 rounded-full bg-success">
            <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
          </span>
          مباشر
        </div>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiData.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} positiveIsGood={kpi.label !== 'البلاغات النشطة' && kpi.label !== 'متوسط الاستجابة'} />
        ))}
      </div>

      {/* Alerts strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {alertItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 bg-card rounded-xl border border-border p-4">
              <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg', item.bgClass)}>
                <Icon className={cn('w-5 h-5', item.iconClass)} />
              </div>
              <div>
                <div className="text-xl font-display font-semibold">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly collection chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-display font-semibold text-foreground">اتجاهات الجمع</h3>
              <p className="text-xs text-muted-foreground">النفايات الشهرية المجموعة مقابل المعاد تدويرها مقابل المردودة للمطمر (طن)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" />مجموعة</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-info" />معاد تدويرها</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-warning" />مطمر</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyCollection} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="recycledGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="landfilledGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="collected" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#collectedGrad)" />
              <Area type="monotone" dataKey="recycled" stroke="hsl(var(--info))" strokeWidth={2} fill="url(#recycledGrad)" />
              <Area type="monotone" dataKey="landfilled" stroke="hsl(var(--warning))" strokeWidth={2} fill="url(#landfilledGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Waste by type pie */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold text-foreground mb-1">تكوين النفايات</h3>
          <p className="text-xs text-muted-foreground mb-4">حسب النوع هذا الشهر</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={wasteByType}
                dataKey="tons"
                nameKey="type"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {wasteByType.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {wasteByType.map((w) => (
              <div key={w.type} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: w.color }} />
                <span className="text-muted-foreground flex-1 truncate">{w.type}</span>
                <span className="font-medium">{w.tons}طن</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone performance + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone performance */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold text-foreground mb-1">أداء المناطق</h3>
          <p className="text-xs text-muted-foreground mb-4">البلاغات ونسبة إعادة التدوير والالتزام بمستوى الخدمة حسب المنطقة</p>
          <div className="space-y-3">
            {zones.map((zone) => (
              <div key={zone.zone} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2 sm:w-44 shrink-0">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{zone.zone}</span>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">البلاغات</div>
                    <div className="text-sm font-semibold">{zone.reports}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">إعادة التدوير {zone.recyclingRate}%</div>
                    <ProgressBar value={zone.recyclingRate} barClassName="bg-success" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">مستوى الخدمة {zone.slaCompliance}%</div>
                    <ProgressBar
                      value={zone.slaCompliance}
                      barClassName={zone.slaCompliance >= 95 ? 'bg-success' : zone.slaCompliance >= 90 ? 'bg-warning' : 'bg-destructive'}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">النشاط المباشر</h3>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
            {activityFeed.map((item) => {
              const Icon = activityIcons[item.type] || Activity;
              return (
                <div key={item.id} className="flex gap-3">
                  <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', activityColors[item.type])}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-relaxed">{item.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{item.time}</span>
                      {item.priority && (
                        <span className={cn(
                          'text-[10px] px-1 rounded font-medium',
                          item.priority === 'CRITICAL' ? 'text-destructive' : item.priority === 'HIGH' ? 'text-warning' : 'text-muted-foreground'
                        )}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent reports table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-display font-semibold text-foreground">أحدث بلاغات المواطنين</h3>
            <p className="text-xs text-muted-foreground">آخر البلاغات المرسلة من المواطنين</p>
          </div>
          <a href="/dashboard/reports" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
            عرض الكل <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">رقم البلاغ</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">النوع</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">الموقع</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الأولوية</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الحالة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {citizenReports.slice(0, 8).map((report) => (
                <tr key={report.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-foreground">{report.reportId}</td>
                  <td className="px-3 py-3 hidden md:table-cell text-foreground capitalize">{report.type.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-3">
                    <PriorityBadge label={report.priority} className={priorityBadgeClass[report.priority]} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      label={report.status.replace(/_/g, ' ')}
                      className={reportStatusBadgeClass[report.status]}
                    />
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(report.submittedAt).toLocaleString('ar-DZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
