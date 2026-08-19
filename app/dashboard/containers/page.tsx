'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, ProgressBar } from '@/components/dashboard/badges';
import {
  containers, wasteTypeLabels, containerStatusBadgeClass,
  getFillLevelBg, getFillLevelColor, formatTimeAgo,
} from '@/lib/mock-data';
import type { ContainerStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Search, Download, Plus, Trash2, QrCode, MapPin,
  Wifi, Battery, AlertTriangle, Filter,
} from 'lucide-react';

const statusOptions: (ContainerStatus | 'ALL')[] = ['ALL', 'ACTIVE', 'FULL', 'DAMAGED', 'MAINTENANCE'];
const fillBuckets = [
  { label: 'Critical (>90%)', color: 'bg-destructive', filter: (f: number) => f >= 90 },
  { label: 'High (70-89%)', color: 'bg-warning', filter: (f: number) => f >= 70 && f < 90 },
  { label: 'Medium (40-69%)', color: 'bg-info', filter: (f: number) => f >= 40 && f < 70 },
  { label: 'Low (<40%)', color: 'bg-success', filter: (f: number) => f < 40 },
];

export default function ContainersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContainerStatus | 'ALL'>('ALL');

  const filtered = useMemo(() => {
    return containers.filter((c) => {
      const matchesSearch = c.containerId.toLowerCase().includes(search.toLowerCase()) ||
        c.location.toLowerCase().includes(search.toLowerCase()) ||
        c.zone.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const total = containers.length;
    const active = containers.filter(c => c.status === 'ACTIVE').length;
    const full = containers.filter(c => c.status === 'FULL').length;
    const damaged = containers.filter(c => c.status === 'DAMAGED').length;
    const withSensors = containers.filter(c => c.hasSensor).length;
    const avgFill = Math.round(containers.reduce((sum, c) => sum + c.fillLevel, 0) / containers.length);
    return { total, active, full, damaged, withSensors, avgFill };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Containers" description="Monitor container fill levels, status, and maintenance">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> Export
        </button>
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Register
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Containers', value: stats.total, sub: `${stats.withSensors} with sensors`, icon: Trash2, iconClass: 'text-foreground', bgClass: 'bg-card', borderClass: 'border-border' },
          { label: 'Active', value: stats.active, sub: 'Operational', icon: Trash2, iconClass: 'text-success', bgClass: 'bg-success/5', borderClass: 'border-success/20' },
          { label: 'Full / Needs Pickup', value: stats.full, sub: 'Urgent attention', icon: AlertTriangle, iconClass: 'text-warning', bgClass: 'bg-warning/5', borderClass: 'border-warning/20' },
          { label: 'Avg Fill Level', value: `${stats.avgFill}%`, sub: 'Across all containers', icon: Battery, iconClass: 'text-info', bgClass: 'bg-info/5', borderClass: 'border-info/20' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-xl border p-4', s.bgClass, s.borderClass)}>
              <div className="flex items-center justify-between mb-1">
                <div className={cn('text-2xl font-display font-semibold', s.iconClass)}>{s.value}</div>
                <Icon className={cn('w-5 h-5', s.iconClass)} />
              </div>
              <div className="text-xs font-medium text-foreground">{s.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Fill distribution */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-display font-semibold text-foreground mb-4">Fill Level Distribution</h3>
        <div className="flex h-4 rounded-full overflow-hidden">
          {fillBuckets.map((bucket) => {
            const count = containers.filter(c => bucket.filter(c.fillLevel)).length;
            const pct = (count / containers.length) * 100;
            return (
              <div
                key={bucket.label}
                className={bucket.color}
                style={{ width: `${pct}%` }}
                title={`${bucket.label}: ${count} containers`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          {fillBuckets.map((bucket) => {
            const count = containers.filter(c => bucket.filter(c.fillLevel)).length;
            return (
              <div key={bucket.label} className="flex items-center gap-1.5">
                <span className={cn('w-2.5 h-2.5 rounded-sm', bucket.color)} />
                <span className="text-muted-foreground">{bucket.label}</span>
                <span className="font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, location, or zone..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContainerStatus | 'ALL')}
          className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s}</option>
          ))}
        </select>
      </div>

      {/* Container cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No containers match your filters
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md hover:border-primary/20 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">{c.containerId}</div>
                  <div className="text-sm font-medium text-foreground mt-0.5">{c.type}</div>
                </div>
                <StatusBadge label={c.status} className={containerStatusBadgeClass[c.status]} />
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Fill Level</span>
                    <span className={cn('font-medium', getFillLevelColor(c.fillLevel))}>{c.fillLevel}%</span>
                  </div>
                  <ProgressBar
                    value={c.fillLevel}
                    barClassName={getFillLevelBg(c.fillLevel)}
                  />
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{wasteTypeLabels[c.wasteType]}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{c.location}</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {c.hasSensor ? (
                      <span className="flex items-center gap-1 text-info">
                        <Wifi className="w-3 h-3" /> IoT
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Wifi className="w-3 h-3 opacity-40" /> No sensor
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground">{formatTimeAgo(c.lastCollection)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
