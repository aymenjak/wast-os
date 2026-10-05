'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { cn } from '@/lib/utils';
import { useCrud } from '@/hooks/use-crud';
import { marketplaceConfig } from '@/lib/table-configs';
import type { MarketplaceListing } from '@/lib/types';
import { Store, Search, Package, MapPin, Calendar, Plus } from 'lucide-react';
import { useState, useMemo } from 'react';

const statusConfig: Record<string, { label: string; color: string }> = {
  available: { label: 'متاح', color: 'bg-success/15 text-success' },
  reserved: { label: 'محجوز', color: 'bg-warning/15 text-warning' },
  sold: { label: 'مباع', color: 'bg-muted text-muted-foreground' },
};

export default function MarketplacePage() {
  const { data: marketplaceListings, loading, error } = useCrud<MarketplaceListing>(marketplaceConfig);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    marketplaceListings.filter(l => l.material.toLowerCase().includes(search.toLowerCase()) || l.seller.toLowerCase().includes(search.toLowerCase()))
  , [marketplaceListings, search]);

  const stats = {
    total: marketplaceListings.length,
    available: marketplaceListings.filter(l => l.status === 'available').length,
    totalValue: marketplaceListings.filter(l => l.status === 'available').reduce((s, l) => s + l.quantity * l.price, 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {loading && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      {error && <div className="text-center py-12 text-destructive text-sm">خطأ: {error}</div>}
      <PageHeader title="سوق إعادة التدوير" description="سوق بين الشركات لبيع وشراء المواد المسترجعة">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> عرض مادة
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'إجمالي العروض', value: stats.total, icon: Store, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'متاح', value: stats.available, icon: Package, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'القيمة السوقية', value: `${(stats.totalValue / 1000000).toFixed(1)}م دج`, icon: Store, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
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
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                <span className="text-sm font-medium text-foreground ml-auto">{l.price.toLocaleString()} دج/{l.unit}</span>
              </div>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {l.seller}</div>
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {l.location}</div>
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> متاح: {l.availableDate}</div>
              </div>
              {l.status === 'available' && (
                <button className="w-full mt-4 h-8 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                  طلب شراء
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
