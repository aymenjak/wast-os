'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { businesses } from '@/lib/mock-data';
import {
  Search, Plus, Download, Building2, MapPin, Mail, Phone,
  Recycle, FileText, AlertCircle, CheckCircle2, Clock, XCircle,
} from 'lucide-react';

const contractStatusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: 'Active', color: 'text-success bg-success/10', icon: CheckCircle2 },
  pending: { label: 'Pending', color: 'text-warning bg-warning/10', icon: Clock },
  expired: { label: 'Expired', color: 'text-destructive bg-destructive/10', icon: XCircle },
  none: { label: 'No Contract', color: 'text-muted-foreground bg-muted', icon: AlertCircle },
};

export default function BusinessesPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return businesses.filter(b =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase()) ||
      b.zone.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const stats = useMemo(() => ({
    total: businesses.length,
    activeContracts: businesses.filter(b => b.contractStatus === 'active').length,
    outstanding: businesses.reduce((sum, b) => sum + b.outstandingBalance, 0),
    totalVolume: Math.round(businesses.reduce((sum, b) => sum + b.monthlyVolume, 0) * 10) / 10,
  }), []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Businesses" description="Manage B2B customers, contracts, and collection services">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-card border border-border text-sm font-medium hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> Export
        </button>
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Business
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Businesses', value: stats.total, icon: Building2, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'Active Contracts', value: stats.activeContracts, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'Outstanding', value: `${(stats.outstanding / 1000).toFixed(0)}k DZD`, icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20' },
          { label: 'Monthly Volume', value: `${stats.totalVolume}t`, icon: Recycle, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, category, or zone..."
          className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(b => {
          const cfg = contractStatusConfig[b.contractStatus];
          const StatusIcon = cfg.icon;
          return (
            <div key={b.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/20 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-display font-semibold text-foreground text-sm">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.category}</div>
                  </div>
                </div>
                <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', cfg.color)}>
                  <StatusIcon className="w-3 h-3" /> {cfg.label}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> {b.address}, {b.zone}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" /> {b.contactEmail}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" /> {b.contactPhone}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50">
                <div>
                  <div className="text-sm font-semibold text-foreground">{b.monthlyVolume}t</div>
                  <div className="text-[10px] text-muted-foreground">Monthly</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{b.recyclingRate}%</div>
                  <div className="text-[10px] text-muted-foreground">Recycling</div>
                </div>
                <div>
                  <div className={cn('text-sm font-semibold', b.outstandingBalance > 0 ? 'text-destructive' : 'text-success')}>
                    {b.outstandingBalance > 0 ? `${(b.outstandingBalance / 1000).toFixed(0)}k` : 'Paid'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Balance</div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button className="flex-1 h-8 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors">View Details</button>
                <button className="flex-1 h-8 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">New Request</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
