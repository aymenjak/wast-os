'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { ProgressBar } from '@/components/dashboard/badges';
import { cn } from '@/lib/utils';
import { useCrud } from '@/hooks/use-crud';
import { subscriptionConfig } from '@/lib/table-configs';
import { planFeatures } from '@/lib/mock-data';
import type { Subscription } from '@/lib/types';
import {
  Search, CreditCard, CheckCircle2, Clock, XCircle, AlertTriangle,
  Building2, Users, MapPin, Database, Zap, HardDrive, Check, X,
  RefreshCw, Plus, TrendingUp, Calendar, Mail, Phone,
} from 'lucide-react';

const planConfig: Record<string, { label: string; color: string; price: number }> = {
  basic: { label: 'أساسي', color: 'bg-muted text-muted-foreground', price: 45000 },
  pro: { label: 'احترافي', color: 'bg-info/15 text-info', price: 120000 },
  enterprise: { label: 'مؤسسات', color: 'bg-primary/15 text-primary', price: 250000 },
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'نشط', color: 'text-success bg-success/10', icon: CheckCircle2 },
  trial: { label: 'تجريبي', color: 'text-info bg-info/10', icon: Clock },
  expired: { label: 'منتهي', color: 'text-destructive bg-destructive/10', icon: XCircle },
  suspended: { label: 'موقوف', color: 'text-warning bg-warning/10', icon: AlertTriangle },
  pending: { label: 'بانتظار التفعيل', color: 'text-muted-foreground bg-muted', icon: Clock },
};

const orgTypeLabels: Record<string, string> = {
  municipality: 'بلدية',
  business: 'شركة',
  recycler: 'مُعيد تدوير',
};

export default function SubscriptionsPage() {
  const { data: subscriptions, loading, error } = useCrud<Subscription>(subscriptionConfig);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [view, setView] = useState<'list' | 'plans'>('list');

  const filtered = useMemo(() =>
    subscriptions.filter(s => {
      const matchesSearch = s.orgName.toLowerCase().includes(search.toLowerCase()) ||
        s.contactName.toLowerCase().includes(search.toLowerCase());
      const matchesPlan = planFilter === 'ALL' || s.plan === planFilter;
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    })
  , [subscriptions, search, planFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    mrr: subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + s.monthlyFee, 0),
    trial: subscriptions.filter(s => s.status === 'trial').length,
  }), [subscriptions]);

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      {error && <div className="text-center py-12 text-destructive text-sm">خطأ: {error}</div>}
      <PageHeader title="الاشتراكات" description="إدارة اشتراكات المنصة والباقات والفوترة">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> اشتراك جديد
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الاشتراكات', value: stats.total, icon: CreditCard, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'اشتراكات نشطة', value: stats.active, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'الإيراد الشهري المتكرر', value: `${(stats.mrr / 1000).toFixed(0)}ك دج`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
          { label: 'فترة تجريبية', value: stats.trial, icon: Clock, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
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

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView('list')}
          className={cn('px-4 h-9 rounded-lg text-sm font-medium transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:bg-muted')}
        >
          المشتركين
        </button>
        <button
          onClick={() => setView('plans')}
          className={cn('px-4 h-9 rounded-lg text-sm font-medium transition-colors', view === 'plans' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:bg-muted')}
        >
          مقارنة الباقات
        </button>
      </div>

      {view === 'list' ? (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو المؤسسة..."
                className="w-full h-9 pr-9 pl-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <select
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
              className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
            >
              <option value="ALL">كل الباقات</option>
              <option value="basic">أساسي</option>
              <option value="pro">احترافي</option>
              <option value="enterprise">مؤسسات</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
            >
              <option value="ALL">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="trial">تجريبي</option>
              <option value="expired">منتهي</option>
              <option value="suspended">موقوف</option>
              <option value="pending">بانتظار التفعيل</option>
            </select>
          </div>

          {/* Subscription cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(s => {
              const planCfg = planConfig[s.plan];
              const statusCfg = statusConfig[s.status];
              const StatusIcon = statusCfg.icon;
              const userPct = Math.min(100, (s.usedUsers / s.includedUsers) * 100);
              const apiPct = Math.min(100, (s.apiCallsUsed / s.apiCallsLimit) * 100);
              const storagePct = Math.min(100, (s.storageUsedGb / s.storageLimitGb) * 100);

              return (
                <div key={s.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-display font-semibold text-foreground text-sm">{s.orgName}</div>
                        <div className="text-xs text-muted-foreground">{orgTypeLabels[s.orgType]}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', planCfg.color)}>{planCfg.label}</span>
                      <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', statusCfg.color)}>
                        <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Usage bars */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> المستخدمون</span>
                        <span className="font-medium">{s.usedUsers} / {s.includedUsers}</span>
                      </div>
                      <ProgressBar value={userPct} barClassName={userPct > 90 ? 'bg-destructive' : userPct > 70 ? 'bg-warning' : 'bg-primary'} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" /> استدعاءات API</span>
                        <span className="font-medium">{(s.apiCallsUsed / 1000).toFixed(0)}ك / {(s.apiCallsLimit / 1000).toFixed(0)}ك</span>
                      </div>
                      <ProgressBar value={apiPct} barClassName={apiPct > 90 ? 'bg-destructive' : apiPct > 70 ? 'bg-warning' : 'bg-info'} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground flex items-center gap-1"><HardDrive className="w-3 h-3" /> التخزين</span>
                        <span className="font-medium">{s.storageUsedGb} / {s.storageLimitGb} جيجا</span>
                      </div>
                      <ProgressBar value={storagePct} barClassName={storagePct > 90 ? 'bg-destructive' : storagePct > 70 ? 'bg-warning' : 'bg-success'} />
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" /> ينتهي: {s.endDate}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CreditCard className="w-3.5 h-3.5" /> {s.monthlyFee.toLocaleString()} دج/شهر
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" /> {s.usedZones} / {s.includedZones} منطقة
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <RefreshCw className="w-3.5 h-3.5" /> {s.autoRenew ? 'تجديد تلقائي' : 'تجديد يدوي'}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" /> {s.contactEmail}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" /> {s.contactPhone}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-border/50">
                    <button className="flex-1 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">تفاصيل</button>
                    <button className="flex-1 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">فواتير</button>
                    {s.status === 'suspended' || s.status === 'expired' ? (
                      <button className="flex-1 h-8 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors">إعادة تفعيل</button>
                    ) : (
                      <button className="flex-1 h-8 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">إدارة</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Plans comparison */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(['basic', 'pro', 'enterprise'] as const).map(plan => {
            const cfg = planConfig[plan];
            const isPopular = plan === 'pro';
            return (
              <div key={plan} className={cn(
                'bg-card rounded-xl border p-6 relative',
                isPopular ? 'border-primary/40 shadow-lg' : 'border-border'
              )}>
                {isPopular && (
                  <div className="absolute -top-3 right-1/2 translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    الأكثر شعبية
                  </div>
                )}
                <div className={cn('inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium mb-3', cfg.color)}>
                  {cfg.label}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-display font-bold text-foreground">{cfg.price.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">دج/شهر</span>
                </div>
                <div className="text-xs text-muted-foreground mb-5">شامل جميع الميزات الأساسية</div>

                <div className="space-y-2.5 mb-6">
                  {planFeatures.map(f => {
                    const val = f[plan];
                    const isIncluded = val !== false;
                    return (
                      <div key={f.label} className="flex items-start gap-2 text-xs">
                        {isIncluded ? (
                          <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <span className={cn('flex-1', isIncluded ? 'text-foreground' : 'text-muted-foreground')}>
                          {f.label}
                          {typeof val === 'string' && val !== 'true' && (
                            <span className="text-muted-foreground"> — {val}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button className={cn(
                  'w-full h-10 rounded-lg text-sm font-medium transition-colors',
                  isPopular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-border hover:bg-muted'
                )}>
                  اشترك الآن
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
