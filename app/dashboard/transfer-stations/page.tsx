'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { ProgressBar } from '@/components/dashboard/badges';
import { cn } from '@/lib/utils';
import { useCrud } from '@/hooks/use-crud';
import { transferStationConfig } from '@/lib/table-configs';
import type { TransferStation } from '@/lib/types';
import { CityMap, type MapEntity } from '@/components/dashboard/city-map';
import { ArrowRightLeft, MapPin, Truck, Weight, Clock, TrendingUp } from 'lucide-react';

export default function TransferStationsPage() {
  const { data: stations, loading, error } = useCrud<TransferStation>(transferStationConfig);
  const totalIncoming = stations.reduce((s, st) => s + st.incomingToday, 0);
  const totalOutgoing = stations.reduce((s, st) => s + st.outgoingToday, 0);
  const totalTrucks = stations.reduce((s, st) => s + st.trucksProcessed, 0);

  const mapEntities: MapEntity[] = stations.map(st => ({
    id: st.id,
    lat: st.lat,
    lng: st.lng,
    type: 'station' as const,
    label: st.name,
    details: [
      { label: 'الموقع', value: st.location },
      { label: 'المنطقة', value: st.zone },
      { label: 'التخزين', value: `${st.storageCurrent}طن / ${st.storageCapacity}طن` },
      { label: 'وارد', value: `${st.incomingToday}طن` },
      { label: 'صادر', value: `${st.outgoingToday}طن` },
      { label: 'الشاحنات', value: String(st.trucksProcessed) },
      { label: 'متوسط الانتظار', value: st.avgWaitTime },
    ],
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      {error && <div className="text-center py-12 text-destructive text-sm">خطأ: {error}</div>}
      <PageHeader title="محطات التحويل" description="مراقبة تدفق النفايات عبر محطات التحويل" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المحطات', value: stations.length, icon: ArrowRightLeft, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'وارد اليوم', value: `${totalIncoming}طن`, icon: TrendingUp, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
          { label: 'صادر اليوم', value: `${totalOutgoing}طن`, icon: ArrowRightLeft, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'الشاحنات المعالجة', value: totalTrucks, icon: Truck, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
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

      <CityMap entities={mapEntities} center={[36.7380, 3.0800]} zoom={11} height="350px" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stations.map(st => {
          const fillPct = (st.storageCurrent / st.storageCapacity) * 100;
          const isNearCapacity = st.status === 'near_capacity';
          return (
            <div key={st.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex items-center justify-center w-11 h-11 rounded-lg', isNearCapacity ? 'bg-warning/10' : 'bg-primary/10')}>
                    <ArrowRightLeft className={cn('w-5 h-5', isNearCapacity ? 'text-warning' : 'text-primary')} />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-foreground text-sm">{st.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{st.location}</div>
                  </div>
                </div>
                <span className={cn('text-[10px] px-2 py-0.5 rounded font-medium', isNearCapacity ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success')}>
                  {isNearCapacity ? 'قرب الامتلاء' : 'تشغيلي'}
                </span>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">مستوى التخزين</span>
                  <span className="font-medium text-foreground">{st.storageCurrent}طن / {st.storageCapacity}طن</span>
                </div>
                <ProgressBar value={fillPct} barClassName={isNearCapacity ? 'bg-warning' : 'bg-primary'} />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-info/5 p-2">
                  <Weight className="w-4 h-4 text-info mx-auto mb-1" />
                  <div className="text-sm font-semibold text-foreground">{st.incomingToday}طن</div>
                  <div className="text-[10px] text-muted-foreground">وارد</div>
                </div>
                <div className="rounded-lg bg-success/5 p-2">
                  <ArrowRightLeft className="w-4 h-4 text-success mx-auto mb-1" />
                  <div className="text-sm font-semibold text-foreground">{st.outgoingToday}طن</div>
                  <div className="text-[10px] text-muted-foreground">صادر</div>
                </div>
                <div className="rounded-lg bg-primary/5 p-2">
                  <Truck className="w-4 h-4 text-primary mx-auto mb-1" />
                  <div className="text-sm font-semibold text-foreground">{st.trucksProcessed}</div>
                  <div className="text-[10px] text-muted-foreground">الشاحنات</div>
                </div>
                <div className="rounded-lg bg-muted/30 p-2">
                  <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-sm font-semibold text-foreground">{st.avgWaitTime}</div>
                  <div className="text-[10px] text-muted-foreground">متوسط الانتظار</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
