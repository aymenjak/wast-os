'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, ProgressBar } from '@/components/dashboard/badges';
import { vehicles, vehicleStatusBadgeClass } from '@/lib/mock-data';
import type { VehicleStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Search, Download, Plus, Truck, Fuel, Gauge,
  MapPin, User, Navigation, Wrench, Eye,
} from 'lucide-react';

const statusOptions: (VehicleStatus | 'ALL')[] = ['ALL', 'AVAILABLE', 'ON_ROUTE', 'LOADING', 'MAINTENANCE', 'OFFLINE'];

export default function FleetPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch = v.plate.toLowerCase().includes(search.toLowerCase()) ||
        v.driver.toLowerCase().includes(search.toLowerCase()) ||
        v.type.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const onRoute = vehicles.filter(v => v.status === 'ON_ROUTE').length;
    const available = vehicles.filter(v => v.status === 'AVAILABLE').length;
    const maintenance = vehicles.filter(v => v.status === 'MAINTENANCE').length;
    const offline = vehicles.filter(v => v.status === 'OFFLINE').length;
    const avgFuel = Math.round(vehicles.filter(v => v.status !== 'OFFLINE').reduce((sum, v) => sum + v.fuel, 0) / (total - offline));
    return { total, onRoute, available, maintenance, offline, avgFuel };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Fleet Management" description="Monitor vehicles, drivers, fuel, and maintenance status">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> Export
        </button>
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Fleet', value: stats.total, icon: Truck, iconClass: 'text-foreground', bgClass: 'bg-card', borderClass: 'border-border' },
          { label: 'On Route', value: stats.onRoute, icon: Navigation, iconClass: 'text-primary', bgClass: 'bg-primary/5', borderClass: 'border-primary/20' },
          { label: 'Available', value: stats.available, icon: Truck, iconClass: 'text-success', bgClass: 'bg-success/5', borderClass: 'border-success/20' },
          { label: 'In Maintenance', value: stats.maintenance, icon: Wrench, iconClass: 'text-warning', bgClass: 'bg-warning/5', borderClass: 'border-warning/20' },
          { label: 'Avg Fuel', value: `${stats.avgFuel}%`, icon: Fuel, iconClass: 'text-info', bgClass: 'bg-info/5', borderClass: 'border-info/20' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-xl border p-4', s.bgClass, s.borderClass)}>
              <div className="flex items-center justify-between mb-1">
                <div className={cn('text-2xl font-display font-semibold', s.iconClass)}>{s.value}</div>
                <Icon className={cn('w-5 h-5', s.iconClass)} />
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by plate, driver, or type..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | 'ALL')}
          className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Vehicle cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => {
          const loadPct = Math.round((v.currentLoad / v.capacity) * 100);
          return (
            <div key={v.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex items-center justify-center w-11 h-11 rounded-lg',
                    v.status === 'ON_ROUTE' ? 'bg-primary/10' :
                    v.status === 'AVAILABLE' ? 'bg-success/10' :
                    v.status === 'MAINTENANCE' ? 'bg-warning/10' :
                    v.status === 'OFFLINE' ? 'bg-muted' :
                    'bg-info/10'
                  )}>
                    <Truck className={cn(
                      'w-5 h-5',
                      v.status === 'ON_ROUTE' ? 'text-primary' :
                      v.status === 'AVAILABLE' ? 'text-success' :
                      v.status === 'MAINTENANCE' ? 'text-warning' :
                      v.status === 'OFFLINE' ? 'text-muted-foreground' :
                      'text-info'
                    )} />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-foreground">{v.plate}</div>
                    <div className="text-xs text-muted-foreground">{v.type}</div>
                  </div>
                </div>
                <StatusBadge label={v.status.replace(/_/g, ' ')} className={vehicleStatusBadgeClass[v.status]} />
              </div>

              <div className="space-y-3">
                {/* Driver */}
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-medium text-foreground truncate">{v.driver}</span>
                </div>

                {/* Zone */}
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Zone:</span>
                  <span className="font-medium text-foreground">{v.zone}</span>
                </div>

                {/* Load capacity */}
                {v.status !== 'OFFLINE' && v.status !== 'AVAILABLE' && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Load Capacity</span>
                      <span className="font-medium">{loadPct}%</span>
                    </div>
                    <ProgressBar
                      value={loadPct}
                      barClassName={loadPct > 90 ? 'bg-destructive' : loadPct > 70 ? 'bg-warning' : 'bg-info'}
                    />
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {(v.currentLoad / 1000).toFixed(1)}t / {(v.capacity / 1000).toFixed(1)}t
                    </div>
                  </div>
                )}

                {/* On route info */}
                {v.status === 'ON_ROUTE' && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted-foreground">Next:</span>
                      <span className="font-medium text-foreground truncate max-w-[120px]">{v.nextStop}</span>
                    </div>
                    <span className="font-medium text-primary shrink-0">{v.eta}</span>
                  </div>
                )}

                {/* Fuel & mileage */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Fuel className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Fuel:</span>
                    <span className={cn('font-medium', v.fuel < 40 ? 'text-warning' : 'text-foreground')}>{v.fuel}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{(v.mileage / 1000).toFixed(0)}k km</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
