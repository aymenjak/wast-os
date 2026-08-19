'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge, PriorityBadge, ProgressBar } from '@/components/dashboard/badges';
import {
  workOrders, priorityBadgeClass, slaStatusClass, formatTimeAgo,
} from '@/lib/mock-data';
import type { WorkOrderStatus, SLAStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Search, Download, Plus, Clock, AlertTriangle,
  CheckCircle2, Truck, ChevronRight, X,
} from 'lucide-react';

const statusOptions: (WorkOrderStatus | 'ALL')[] = ['ALL', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];
const slaOptions: (SLAStatus | 'ALL')[] = ['ALL', 'ON_TRACK', 'AT_RISK', 'BREACHED'];

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

export default function WorkOrdersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'ALL'>('ALL');
  const [slaFilter, setSlaFilter] = useState<SLAStatus | 'ALL'>('ALL');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    return workOrders.filter((w) => {
      const matchesSearch = w.orderId.toLowerCase().includes(search.toLowerCase()) ||
        w.location.toLowerCase().includes(search.toLowerCase()) ||
        w.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
      const matchesSla = slaFilter === 'ALL' || w.slaStatus === slaFilter;
      return matchesSearch && matchesStatus && matchesSla;
    });
  }, [search, statusFilter, slaFilter]);

  const stats = useMemo(() => {
    const open = workOrders.filter(w => w.status === 'OPEN').length;
    const inProgress = workOrders.filter(w => w.status === 'IN_PROGRESS').length;
    const completed = workOrders.filter(w => w.status === 'COMPLETED').length;
    const breaches = workOrders.filter(w => w.slaStatus === 'BREACHED').length;
    const atRisk = workOrders.filter(w => w.slaStatus === 'AT_RISK').length;
    return { open, inProgress, completed, breaches, atRisk, total: workOrders.length };
  }, []);

  const handleExport = () => {
    const headers = ['Order ID', 'Type', 'Location', 'Priority', 'Status', 'SLA', 'Progress', 'Due'];
    const rows = filtered.map(w => [
      w.orderId, w.type, w.location, w.priority, w.status, w.slaStatus, `${w.progress}%`,
      new Date(w.dueTime).toLocaleString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-orders-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Work Orders" description="Manage and track all operational work orders across the city">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" /> Export
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Order
        </button>
      </PageHeader>

      {/* SLA Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Clock, iconClass: 'text-foreground', bgClass: 'bg-card', borderClass: 'border-border' },
          { label: 'Open', value: stats.open, icon: Clock, iconClass: 'text-muted-foreground', bgClass: 'bg-muted/30', borderClass: 'border-border' },
          { label: 'In Progress', value: stats.inProgress, icon: Truck, iconClass: 'text-primary', bgClass: 'bg-primary/5', borderClass: 'border-primary/20' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, iconClass: 'text-success', bgClass: 'bg-success/5', borderClass: 'border-success/20' },
          { label: 'SLA Breached', value: stats.breaches, icon: AlertTriangle, iconClass: 'text-destructive', bgClass: 'bg-destructive/5', borderClass: 'border-destructive/20' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn('rounded-xl border p-4', s.bgClass, s.borderClass)}>
              <div className="flex items-center justify-between mb-2">
                <div className={cn('text-2xl font-display font-semibold', s.iconClass)}>{s.value}</div>
                <Icon className={cn('w-5 h-5', s.iconClass)} />
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* SLA warning banner */}
      {(stats.breaches > 0 || stats.atRisk > 0) && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 p-4">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-warning">{stats.breaches} SLA breaches</span>
            <span className="text-muted-foreground"> and </span>
            <span className="font-medium text-warning">{stats.atRisk} at risk</span>
            <span className="text-muted-foreground"> — immediate attention required</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, location, or description..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkOrderStatus | 'ALL')}
            className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select
            value={slaFilter}
            onChange={(e) => setSlaFilter(e.target.value as SLAStatus | 'ALL')}
            className="h-9 px-3 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
          >
            {slaOptions.map((s) => (
              <option key={s} value={s}>{s === 'ALL' ? 'All SLA' : s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">Order ID</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Type</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden md:table-cell">Location</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Priority</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Status</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">SLA</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden lg:table-cell">Progress</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3 hidden sm:table-cell">Due</th>
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                    No work orders match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((wo) => (
                  <tr
                    key={wo.id}
                    onClick={() => router.push(`/dashboard/work-orders/${wo.id}`)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer"
                  >
                    <td className="px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap">{wo.orderId}</td>
                    <td className="px-3 py-3 text-foreground capitalize whitespace-nowrap">{wo.type.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-3 hidden md:table-cell text-muted-foreground whitespace-nowrap">{wo.location}</td>
                    <td className="px-3 py-3">
                      <PriorityBadge label={wo.priority} className={priorityBadgeClass[wo.priority]} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge label={wo.status.replace(/_/g, ' ')} className={statusBadgeClass[wo.status]} />
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                        slaBadgeClass[wo.slaStatus]
                      )}>
                        {wo.slaStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={wo.progress}
                          className="w-20"
                          barClassName={
                            wo.status === 'COMPLETED' ? 'bg-success' :
                            wo.status === 'OVERDUE' ? 'bg-destructive' :
                            'bg-primary'
                          }
                        />
                        <span className="text-xs text-muted-foreground w-8">{wo.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(wo.dueTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-3">
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {workOrders.length} work orders</span>
        </div>
      </div>

      {showCreate && <CreateOrderModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CreateOrderModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [type, setType] = useState('citizen_complaint');
  const [priority, setPriority] = useState('NORMAL');
  const [location, setLocation] = useState('');
  const [zone, setZone] = useState('Zone 1 — Centre');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app this would call the API; for now we just close and go to the list
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-xl border border-border shadow-xl z-50 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display text-lg font-semibold">Create Work Order</h2>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option value="citizen_complaint">Citizen Complaint</option>
                <option value="b2b_collection">B2B Collection</option>
                <option value="container_maintenance">Container Maintenance</option>
                <option value="emergency_cleanup">Emergency Cleanup</option>
                <option value="scheduled_route">Scheduled Route</option>
                <option value="illegal_dumping">Illegal Dumping</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Location</label>
            <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 12 Rue Didouche Mourad" className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Zone</label>
            <select value={zone} onChange={(e) => setZone(e.target.value)} className="w-full h-10 px-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors">
              <option>Zone 1 — Centre</option>
              <option>Zone 2 — Nord</option>
              <option>Zone 3 — Est</option>
              <option>Zone 4 — Sud</option>
              <option>Zone 5 — Ouest</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the work to be done..." className="w-full h-24 p-3 text-sm bg-background rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors resize-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Create Order</button>
          </div>
        </form>
      </div>
    </>
  );
}
