'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { ProgressBar } from '@/components/dashboard/badges';
import { cn } from '@/lib/utils';
import { ArrowRightLeft, MapPin, Truck, Weight, Clock, TrendingUp } from 'lucide-react';

const stations = [
  { id: 'ts1', name: 'Transfer Station Est', location: 'Rouiba Industrial Zone', zone: 'Zone 3 — Est', incomingToday: 42, outgoingToday: 38, storageCurrent: 85, storageCapacity: 200, trucksProcessed: 14, avgWaitTime: '12 min', status: 'operational' },
  { id: 'ts2', name: 'Transfer Station Oued Smar', location: 'Oued Smar', zone: 'Zone 5 — Ouest', incomingToday: 56, outgoingToday: 48, storageCurrent: 120, storageCapacity: 250, trucksProcessed: 18, avgWaitTime: '18 min', status: 'operational' },
  { id: 'ts3', name: 'Transfer Station Centre', location: 'Hussein Dey', zone: 'Zone 1 — Centre', incomingToday: 38, outgoingToday: 35, storageCurrent: 68, storageCapacity: 150, trucksProcessed: 12, avgWaitTime: '8 min', status: 'operational' },
  { id: 'ts4', name: 'Transfer Station Sud', location: 'Birkhadem', zone: 'Zone 4 — Sud', incomingToday: 29, outgoingToday: 22, storageCurrent: 142, storageCapacity: 180, trucksProcessed: 9, avgWaitTime: '25 min', status: 'near_capacity' },
];

export default function TransferStationsPage() {
  const totalIncoming = stations.reduce((s, st) => s + st.incomingToday, 0);
  const totalOutgoing = stations.reduce((s, st) => s + st.outgoingToday, 0);
  const totalTrucks = stations.reduce((s, st) => s + st.trucksProcessed, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Transfer Stations" description="Monitor waste flow through transfer stations" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Stations', value: stations.length, icon: ArrowRightLeft, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'Incoming Today', value: `${totalIncoming}t`, icon: TrendingUp, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
          { label: 'Outgoing Today', value: `${totalOutgoing}t`, icon: ArrowRightLeft, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'Trucks Processed', value: totalTrucks, icon: Truck, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
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
                  {isNearCapacity ? 'Near Capacity' : 'Operational'}
                </span>
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Storage Fill</span>
                  <span className="font-medium text-foreground">{st.storageCurrent}t / {st.storageCapacity}t</span>
                </div>
                <ProgressBar value={fillPct} barClassName={isNearCapacity ? 'bg-warning' : 'bg-primary'} />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-info/5 p-2">
                  <Weight className="w-4 h-4 text-info mx-auto mb-1" />
                  <div className="text-sm font-semibold text-foreground">{st.incomingToday}t</div>
                  <div className="text-[10px] text-muted-foreground">Incoming</div>
                </div>
                <div className="rounded-lg bg-success/5 p-2">
                  <ArrowRightLeft className="w-4 h-4 text-success mx-auto mb-1" />
                  <div className="text-sm font-semibold text-foreground">{st.outgoingToday}t</div>
                  <div className="text-[10px] text-muted-foreground">Outgoing</div>
                </div>
                <div className="rounded-lg bg-primary/5 p-2">
                  <Truck className="w-4 h-4 text-primary mx-auto mb-1" />
                  <div className="text-sm font-semibold text-foreground">{st.trucksProcessed}</div>
                  <div className="text-[10px] text-muted-foreground">Trucks</div>
                </div>
                <div className="rounded-lg bg-muted/30 p-2">
                  <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <div className="text-sm font-semibold text-foreground">{st.avgWaitTime}</div>
                  <div className="text-[10px] text-muted-foreground">Avg Wait</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
