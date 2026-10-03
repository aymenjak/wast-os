'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { ecoProfiles, ecoLevels } from '@/lib/mock-data';
import { Trophy, Star, Recycle, ClipboardList, CheckCircle2, Award, TrendingUp } from 'lucide-react';

const levelColors: Record<string, string> = {
  'مبتدئ بيئي': 'text-muted-foreground bg-muted',
  'مواطن بيئي': 'text-info bg-info/10',
  'مواطن أخضر': 'text-success bg-success/10',
  'بطل بيئي': 'text-primary bg-primary/10',
  'حامي المدينة': 'text-accent bg-accent/10',
};

export default function EcoPointsPage() {
  const totalPoints = ecoProfiles.reduce((s, p) => s + p.ecoPoints, 0);
  const totalReports = ecoProfiles.reduce((s, p) => s + p.totalReports, 0);
  const totalVerified = ecoProfiles.reduce((s, p) => s + p.verifiedReports, 0);
  const totalCleanups = ecoProfiles.reduce((s, p) => s + p.cleanups, 0);
  const sorted = [...ecoProfiles].sort((a, b) => b.ecoPoints - a.ecoPoints);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="النقاط البيئية" description="تحفيز المواطنين — مكافأة البلاغات وإعادة التدوير والتنظيفات" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي النقاط الممنوحة', value: totalPoints.toLocaleString(), icon: Trophy, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'البلاغات المرسلة', value: totalReports, icon: ClipboardList, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
          { label: 'بلاغات موثّقة', value: totalVerified, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'تنظيفات شارك فيها', value: totalCleanups, icon: Recycle, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-warning" />
            <h3 className="font-display font-semibold text-foreground">لوحة المتصدّرين</h3>
          </div>
          <div className="space-y-2">
            {sorted.map((p, i) => (
              <div key={p.id} className={cn(
                'flex items-center gap-4 p-3 rounded-lg border transition-all',
                i === 0 ? 'border-warning/30 bg-warning/5' : 'border-border hover:bg-muted/30'
              )}>
                <div className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-full font-display font-bold text-sm shrink-0',
                  i === 0 ? 'bg-warning/20 text-warning' : i === 1 ? 'bg-muted text-muted-foreground' : i === 2 ? 'bg-orange-500/15 text-orange-500' : 'bg-muted/50 text-muted-foreground'
                )}>
                  {i + 1}
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-accent/80 text-white text-xs font-semibold shrink-0">
                  {p.citizen.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{p.citizen}</div>
                  <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5', levelColors[p.level])}>{p.level}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-foreground">{p.ecoPoints.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">نقطة بيئية</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Level system */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-accent" />
            <h3 className="font-display font-semibold text-foreground">نظام المستويات</h3>
          </div>
          <div className="space-y-3">
            {ecoLevels.map(level => {
              const count = ecoProfiles.filter(p => p.level === level.name).length;
              return (
                <div key={level.name} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', levelColors[level.name])}>
                    <Star className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-medium', level.color)}>{level.name}</div>
                    <div className="text-[10px] text-muted-foreground">{level.minPoints.toLocaleString()}+ نقطة</div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">النقاط المكتسبة لكل فعل</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">بلاغ موثّق</span><span className="font-medium text-foreground">+50</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">فعل إعادة تدوير</span><span className="font-medium text-foreground">+30</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">مشاركة في تنظيف</span><span className="font-medium text-foreground">+100</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">تسجيل دخول يومي</span><span className="font-medium text-foreground">+5</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Individual stats */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">تفصيل نشاط المواطنين</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sorted.map(p => (
            <div key={p.id} className="p-4 rounded-lg border border-border">
              <div className="text-sm font-medium text-foreground mb-3">{p.citizen}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><div className="text-muted-foreground">البلاغات</div><div className="font-semibold text-foreground">{p.totalReports}</div></div>
                <div><div className="text-muted-foreground">موثّقة</div><div className="font-semibold text-success">{p.verifiedReports}</div></div>
                <div><div className="text-muted-foreground">إعادة التدوير</div><div className="font-semibold text-info">{p.recyclingActions}</div></div>
                <div><div className="text-muted-foreground">التنظيفات</div><div className="font-semibold text-primary">{p.cleanups}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
