'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { marketplaceListings } from '@/lib/mock-data';
import { Store, Search, Package, MapPin, Calendar, Plus } from 'lucide-react';
import { useState, useMemo } from 'react';

const statusConfig: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'bg-success/15 text-success' },
  reserved: { label: 'Reserved', color: 'bg-warning/15 text-warning' },
  sold: { label: 'Sold', color: 'bg-muted text-muted-foreground' },
};

export default function MarketplacePage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    marketplaceListings.filter(l => l.material.toLowerCase().includes(search.toLowerCase()) || l.seller.toLowerCase().includes(search.toLowerCase()))
  , [search]);

  const stats = {
    total: marketplaceListings.length,
    available: marketplaceListings.filter(l => l.status === 'available').length,
    totalValue: marketplaceListings.filter(l => l.status === 'available').reduce((s, l) => s + l.quantity * l.price, 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Recycling Marketplace" description="B2B marketplace for buying and selling recovered materials">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> List Material
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Total Listings', value: stats.total, icon: Store, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'Available', value: stats.available, icon: Package, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'Market Value', value: `${(stats.totalValue / 1000000).toFixed(1)}M DZD`, icon: Store, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
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
          placeholder="Search by material or seller..."
          className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(l => {
          const cfg = statusConfig[l.status];
          return (
            <div key={l.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-display font-semibold text-foreground">{l.material}</div>
                  <div className="text-xs text-muted-foreground">{l.quality}</div>
                </div>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', cfg.color)}>{cfg.label}</span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-display font-bold text-foreground">{l.quantity}</span>
                <span className="text-sm text-muted-foreground">{l.unit}</span>
                <span className="text-sm font-medium text-foreground ml-auto">{l.price.toLocaleString()} DZD/{l.unit}</span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {l.seller}</div>
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {l.location}</div>
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Available: {l.availableDate}</div>
              </div>
              {l.status === 'available' && (
                <button className="w-full mt-4 h-8 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                  Request to Buy
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
