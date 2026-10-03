'use client';

import { PageHeader } from '@/components/dashboard/page-header';
import { ProgressBar } from '@/components/dashboard/badges';
import { cn } from '@/lib/utils';
import { materialInventory } from '@/lib/mock-data';
import { Package, Search, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useState, useMemo } from 'react';

const qualityColors: Record<string, string> = {
  A: 'bg-success/15 text-success',
  B: 'bg-info/15 text-info',
  C: 'bg-warning/15 text-warning',
};

export default function MaterialsPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    materialInventory.filter(m => m.material.toLowerCase().includes(search.toLowerCase()))
  , [search]);

  const stats = {
    totalStock: materialInventory.reduce((s, m) => s + m.currentStock, 0),
    totalValue: materialInventory.reduce((s, m) => s + m.currentStock * m.pricePerTon, 0),
    incoming: materialInventory.reduce((s, m) => s + m.incoming, 0),
    sold: materialInventory.reduce((s, m) => s + m.sold, 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="المواد والمخزون" description="تتبع مخزون المواد المسترجعة وحركاتها وتقييمها">
        <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> إضافة مخزون
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المخزون', value: `${stats.totalStock}طن`, icon: Package, color: 'text-foreground', bg: 'bg-card', border: 'border-border' },
          { label: 'قيمة المخزون', value: `${(stats.totalValue / 1000000).toFixed(1)}م دج`, icon: TrendingUp, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20' },
          { label: 'وارد اليوم', value: `${stats.incoming}طن`, icon: TrendingDown, color: 'text-info', bg: 'bg-info/5', border: 'border-info/20' },
          { label: 'مبيع اليوم', value: `${stats.sold}طن`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20' },
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
          placeholder="Search materials..."
          className="w-full h-9 pl-9 pr-4 text-sm bg-card rounded-lg border border-border focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map(m => {
          const stockPct = Math.min(100, (m.currentStock / (m.openingStock + m.incoming)) * 100);
          return (
            <div key={m.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="font-display font-semibold text-foreground text-sm">{m.material}</div>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', qualityColors[m.quality])}>درجة {m.quality}</span>
              </div>
              <div className="text-3xl font-display font-bold text-foreground">{m.currentStock}<span className="text-sm text-muted-foreground font-normal ml-1">{m.unit}</span></div>
              <div className="mt-2">
                <ProgressBar value={stockPct} barClassName="bg-primary" />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div><span className="text-muted-foreground">وارد:</span> <span className="font-medium text-info">{m.incoming}</span></div>
                <div><span className="text-muted-foreground">مبيع:</span> <span className="font-medium text-success">{m.sold}</span></div>
                <div><span className="text-muted-foreground">السعر:</span> <span className="font-medium">{(m.pricePerTon / 1000).toFixed(0)}ك</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
