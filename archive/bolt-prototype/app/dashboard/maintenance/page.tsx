'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { ProgressBar } from '@/components/dashboard/badges';
import { cn } from '@/lib/utils';
import { vehicles } from '@/lib/mock-data';
import { Wrench, Truck, Calendar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const maintenanceItems = [
  { id: 'm1', vehicle: 'TC-009', type: 'Oil Change', status: 'in_progress', assignedTo: 'Atelier Central', startDate: '2024-08-14', estCompletion: '2024-08-15', cost: 12000, mileage: 78420 },
  { id: 'm2', vehicle: 'TC-022', type: 'Engine Repair', status: 'in_progress', assignedTo: 'Atelier Central', startDate: '2024-08-10', estCompletion: '2024-08-20', cost: 85000, mileage: 92100 },
  { id: 'm3', vehicle: 'TC-023', type: 'Hydraulic System', status: 'in_progress', assignedTo: 'Atelier Sud', startDate: '2024-08-12', estCompletion: '2024-08-18', cost: 45000, mileage: 67300 },
  { id: 'm4', vehicle: 'TC-017', type: 'Brake Service', status: 'scheduled', assignedTo: 'Atelier Central', startDate: '2024-08-20', estCompletion: '2024-08-21', cost: 15000, mileage: 54800 },
  { id: 'm5', vehicle: 'TC-005', type: 'Tire Replacement', status: 'scheduled', assignedTo: 'Atelier Est', startDate: '2024-08-22', estCompletion: '2024-08-22', cost: 28000, mileage: 81200 },
  { id: 'm6', vehicle: 'TC-014', type: 'Annual Inspection', status: 'scheduled', assignedTo: 'Atelier Central', startDate: '2024-08-25', estCompletion: '2024-08-26', cost: 8000, mileage: 45600 },
  { id: 'm7', vehicle: 'TC-002', type: 'Transmission Service', status: 'completed', assignedTo: 'Atelier Central', startDate: '2024-08-01', estCompletion: '2024-08-05', cost: 38000, mileage: 71900 },
  { id: 'm8', vehicle: 'TC-008', type: 'Oil Change', status: 'completed', assignedTo: 'Atelier Est', startDate: '2024-08-03', estCompletion: '2024-08-04', cost: 11000, mileage: 52300 },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  in_progress: { label: 'In Progress', color: 'bg-primary/15 text-primary', icon: Wrench },
  scheduled: { label: 'Scheduled', color: 'bg-info/15 text-info', icon: Calendar },
  completed: { label: 'Completed', color: 'bg-success/15 text-success', icon: CheckCircle2 },
};

export default function MaintenancePage() {
  const inProgress = maintenanceItems.filter(m => m.status === 'in_progress');
  const scheduled = maintenanceItems.filter(m => m.status === 'scheduled');
  const completed = maintenanceItems.filter(m => m.status === 'completed');
  const totalCost = maintenanceItems.reduce((s, m) => s + m.cost, 0);
  const maintenanceVehicles = vehicles.filter(v => v.status === 'MAINTENANCE');

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Maintenance" description="Track vehicle maintenance schedules and workshop status" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'In Progress', value: inProgress.length, icon: Wrench, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
          { label: 'Scheduled', value: scheduled.length, icon: Calendar, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
          { label: 'Completed (Aug)', value: completed.length, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'Total Cost', value: `${(totalCost / 1000).toFixed(0)}k DZD`, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
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

      {maintenanceVehicles.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-display font-semibold text-foreground mb-1">Currently in Workshop</h3>
          <p className="text-xs text-muted-foreground mb-4">Vehicles undergoing maintenance</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {maintenanceVehicles.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{v.plate}</div>
                  <div className="text-xs text-muted-foreground">{v.type} · {v.mileage.toLocaleString()}km</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Maintenance Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">Vehicle</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Type</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">Workshop</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">Start</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">Est. Completion</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Cost</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceItems.map(m => {
                const cfg = statusConfig[m.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{m.vehicle}</td>
                    <td className="px-3 py-3 text-foreground">{m.type}</td>
                    <td className="px-3 py-3 hidden md:table-cell text-muted-foreground">{m.assignedTo}</td>
                    <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">{m.startDate}</td>
                    <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">{m.estCompletion}</td>
                    <td className="px-3 py-3 font-semibold text-foreground whitespace-nowrap">{m.cost.toLocaleString()} DZD</td>
                    <td className="px-3 py-3"><span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium w-fit', cfg.color)}><StatusIcon className="w-3 h-3" />{cfg.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
