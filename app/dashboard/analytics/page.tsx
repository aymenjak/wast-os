'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { ProgressBar } from '@/components/dashboard/badges';
import {
  zones, wasteByType, monthlyCollection, kpiData,
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Download, TrendingUp, TrendingDown, Leaf, Factory,
  Truck, Users, DollarSign, Recycle, BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const analyticsNav = [
  { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
  { id: 'operations', label: 'العمليات', icon: Truck },
  { id: 'waste', label: 'النفايات', icon: Recycle },
  { id: 'finance', label: 'المالية', icon: DollarSign },
  { id: 'citizen', label: 'المواطن', icon: Users },
  { id: 'esg', label: 'ESG', icon: Leaf },
];

const radialData = [
  { name: 'إعادة التدوير', value: 68, fill: 'hsl(var(--primary))' },
  { name: 'الخدمة', value: 94, fill: 'hsl(var(--info))' },
  { name: 'الكفاءة', value: 87, fill: 'hsl(var(--success))' },
];

const efficiencyData = [
  { metric: 'كفاءة المسار', value: 87 },
  { metric: 'نسبة الجمع', value: 92 },
  { metric: 'استغلال الأسطول', value: 78 },
  { metric: 'رضا المواطنين', value: 89 },
  { metric: 'نسبة إعادة التدوير', value: 68 },
  { metric: 'الالتزام بالخدمة', value: 94 },
];

const financeData = [
  { month: 'جانفي', revenue: 4200, costs: 2800 },
  { month: 'فيفري', revenue: 4500, costs: 2900 },
  { month: 'مارس', revenue: 4800, costs: 3000 },
  { month: 'أفريل', revenue: 4600, costs: 3100 },
  { month: 'ماي', revenue: 5200, costs: 3200 },
  { month: 'جوان', revenue: 5500, costs: 3300 },
  { month: 'جويلية', revenue: 5800, costs: 3400 },
  { month: 'أوت', revenue: 6100, costs: 3500 },
];

const esgData = [
  { label: 'إجمالي النفايات المُدارة', value: '1,847 طن', change: '+12.4%', positive: true },
  { label: 'انبعاثات CO₂ الموفرة', value: '842 طن', change: '+18.1%', positive: true },
  { label: 'المواد المسترجعة', value: '1,260 طن', change: '+7.8%', positive: true },
  { label: 'تحويل عن المطمر', value: '68.2%', change: '+5.1%', positive: true },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="الإحصائيات" description="رؤى عميقة عبر العمليات والنفايات والمالية ومؤشرات ESG">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> تصدير CSV
        </button>
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Download className="w-4 h-4" /> تقرير PDF
        </button>
      </PageHeader>

      {/* Analytics nav tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1">
        {analyticsNav.map((tab, i) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={cn(
                'flex items-center gap-2 px-3 h-8 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                i === 0 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الإيرادات', value: '6.1م دج', change: '+8.9%', positive: true, icon: DollarSign },
          { label: 'المواطنون النشطون', value: '12,840', change: '+14.2%', positive: true, icon: Users },
          { label: 'حجم الجمع', value: '1,847 طن', change: '+12.4%', positive: true, icon: Truck },
          { label: 'نسبة إعادة التدوير', value: '68.2%', change: '+5.1%', positive: true, icon: Recycle },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10">
                  <Icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <span className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  kpi.positive ? 'text-success' : 'text-destructive'
                )}>
                  {kpi.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {kpi.change}
                </span>
              </div>
              <div className="text-xl font-display font-semibold">{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Revenue chart + Radial gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-display font-semibold text-foreground">الإيرادات مقابل التكاليف التشغيلية</h3>
              <p className="text-xs text-muted-foreground">مقارنة شهرية (آلاف دج)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary" />الإيرادات</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-warning" />التكاليف</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={financeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
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
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold text-foreground mb-1">مقاييس الأداء</h3>
          <p className="text-xs text-muted-foreground mb-4">مؤشرات تشغيلية رئيسية</p>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart innerRadius="35%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'hsl(var(--muted))' }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {radialData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.fill }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Waste composition + efficiency bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold text-foreground mb-1">تكوين النفايات عبر الزمن</h3>
          <p className="text-xs text-muted-foreground mb-4">شهرياً: المجموع مقابل المعاد تدويره</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyCollection} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="aCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="aRecycled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
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
              <Area type="monotone" dataKey="collected" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#aCollected)" />
              <Area type="monotone" dataKey="recycled" stroke="hsl(var(--info))" strokeWidth={2} fill="url(#aRecycled)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold text-foreground mb-1">الكفاءة التشغيلية</h3>
          <p className="text-xs text-muted-foreground mb-4">مؤشرات الأداء عبر الأقسام</p>
          <div className="space-y-4">
            {efficiencyData.map((item) => (
              <div key={item.metric}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-foreground">{item.metric}</span>
                  <span className="font-semibold text-foreground">{item.value}%</span>
                </div>
                <ProgressBar
                  value={item.value}
                  barClassName={
                    item.value >= 90 ? 'bg-success' :
                    item.value >= 75 ? 'bg-primary' :
                    item.value >= 60 ? 'bg-warning' :
                    'bg-destructive'
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ESG Section */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-5 h-5 text-success" />
          <h3 className="font-display font-semibold text-foreground">ESG والأثر البيئي</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">مؤشرات البيئية والاجتماعية والحوكمة</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {esgData.map((item) => (
            <div key={item.label} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={cn('flex items-center gap-0.5 text-xs font-medium', item.positive ? 'text-success' : 'text-destructive')}>
                  {item.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {item.change}
                </span>
              </div>
              <div className="text-2xl font-display font-semibold text-foreground">{item.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Zone comparison table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">مقارنة المناطق</h3>
          <p className="text-xs text-muted-foreground">تفصيل الأداء حسب المنطقة</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">المنطقة</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">البلاغات</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">النفايات (طن)</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">إعادة التدوير</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">الخدمة</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.zone} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{z.zone}</td>
                  <td className="px-3 py-3 text-foreground">{z.reports}</td>
                  <td className="px-3 py-3 text-foreground">{z.wasteCollected}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={z.recyclingRate} className="w-16" barClassName="bg-success" />
                      <span className="text-xs text-muted-foreground">{z.recyclingRate}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar
                        value={z.slaCompliance}
                        className="w-16"
                        barClassName={z.slaCompliance >= 95 ? 'bg-success' : z.slaCompliance >= 90 ? 'bg-warning' : 'bg-destructive'}
                      />
                      <span className="text-xs text-muted-foreground">{z.slaCompliance}%</span>
                    </div>
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
