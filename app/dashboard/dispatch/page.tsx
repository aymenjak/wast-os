'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { useCrud } from '@/hooks/use-crud';
import { vehicleConfig, containerConfig, reportConfig } from '@/lib/table-configs';
import { cn } from '@/lib/utils';
import { CityMap, type MapEntity } from '@/components/dashboard/city-map';
import {
  Truck, Trash2, AlertTriangle, Layers, Navigation,
} from 'lucide-react';
import type { Vehicle, Container, CitizenReport } from '@/lib/types';

type LayerType = 'trucks' | 'containers' | 'reports';

export default function DispatchPage() {
  const { data: vehicles, loading: vehLoading, error: vehError } = useCrud<Vehicle>(vehicleConfig);
  const { data: containers, loading: contLoading, error: contError } = useCrud<Container>(containerConfig);
  const { data: citizenReports, loading: repLoading, error: repError } = useCrud<CitizenReport>(reportConfig);
  const loading = vehLoading || contLoading || repLoading;
  const error = vehError || contError || repError;
  const [activeLayers, setActiveLayers] = useState<Record<LayerType, boolean>>({
    trucks: true,
    containers: true,
    reports: true,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const entities: MapEntity[] = useMemo(() => {
    const result: MapEntity[] = [];
    if (activeLayers.trucks) {
      vehicles.filter(v => v.status === 'ON_ROUTE' || v.status === 'LOADING').forEach(v => {
        result.push({
          id: v.id,
          lat: v.lat,
          lng: v.lng,
          type: 'truck',
          label: v.plate,
          details: [
            { label: 'السائق', value: v.driver },
            { label: 'النوع', value: v.type },
            { label: 'المنطقة', value: v.zone },
            { label: 'الحالة', value: v.status.replace(/_/g, ' ') },
            { label: 'السرعة', value: `${v.speed} كم/س` },
            { label: 'الوقود', value: `${v.fuel}%` },
            { label: 'المحطة التالية', value: v.nextStop },
            { label: 'الوصول المتوقع', value: v.eta },
          ],
        });
      });
    }
    if (activeLayers.containers) {
      containers.forEach(c => {
        result.push({
          id: c.id,
          lat: c.lat,
          lng: c.lng,
          type: 'container',
          label: c.containerId,
          details: [
            { label: 'النوع', value: c.type },
            { label: 'النفايات', value: c.wasteType },
            { label: 'الموقع', value: c.location },
            { label: 'Zone', value: c.zone },
            { label: 'الامتلاء', value: `${c.fillLevel}%` },
            { label: 'الحالة', value: c.status },
            { label: 'المستشعر', value: c.hasSensor ? 'نشط' : 'لا يوجد' },
          ],
        });
      });
    }
    if (activeLayers.reports) {
      citizenReports.filter(r => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(r.status)).forEach(r => {
        result.push({
          id: r.id,
          lat: r.lat,
          lng: r.lng,
          type: 'report',
          label: r.reportId,
          details: [
            { label: 'النوع', value: r.type.replace(/_/g, ' ') },
            { label: 'المواطن', value: r.citizenName },
            { label: 'الموقع', value: r.location },
            { label: 'Zone', value: r.zone },
            { label: 'الأولوية', value: r.priority },
            { label: 'الحالة', value: r.status.replace(/_/g, ' ') },
            ...(r.assignedTeam ? [{ label: 'الفريق', value: r.assignedTeam }] : []),
          ],
        });
      });
    }
    return result;
  }, [activeLayers, vehicles, containers, citizenReports]);

  const counts = {
    trucks: vehicles.filter(v => v.status === 'ON_ROUTE' || v.status === 'LOADING').length,
    containers: containers.length,
    reports: citizenReports.filter(r => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(r.status)).length,
  };

  const layerConfig: { key: LayerType; label: string; icon: typeof Truck; color: string; count: number }[] = [
    { key: 'trucks', label: 'الشاحنات', icon: Truck, color: 'bg-primary', count: counts.trucks },
    { key: 'containers', label: 'الحاويات', icon: Trash2, color: 'bg-info', count: counts.containers },
    { key: 'reports', label: 'البلاغات', icon: AlertTriangle, color: 'bg-destructive', count: counts.reports },
  ];

  const selectedEntity = entities.find(e => e.id === selectedId);

  return (
    <div className="space-y-4 animate-fade-in">
      {loading && <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل...</div>}
      {error && <div className="text-center py-12 text-destructive text-sm">خطأ: {error}</div>}
      <PageHeader title="خريطة الإرسال المباشرة" description="مواقع لحظية للأسطول والحاويات والبلاغات عبر المدينة">
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-success/10 text-success text-sm font-medium">
          <span className="relative w-2 h-2 rounded-full bg-success">
            <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
          </span>
          تتبع مباشر
        </div>
      </PageHeader>

      {/* Layer toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground mr-2">
          <Layers className="w-4 h-4" /> الطبقات:
        </span>
        {layerConfig.map((layer) => {
          const Icon = layer.icon;
          const active = activeLayers[layer.key];
          return (
            <button
              key={layer.key}
              onClick={() => setActiveLayers(prev => ({ ...prev, [layer.key]: !prev[layer.key] }))}
              className={cn(
                'flex items-center gap-2 px-3 h-8 rounded-lg text-sm font-medium border transition-all',
                active
                  ? 'border-primary/30 bg-primary/5 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <span className={cn('flex items-center justify-center w-4 h-4 rounded', active ? layer.color : 'bg-muted')}>
                <Icon className="w-3 h-3 text-white" />
              </span>
              {layer.label}
              <span className={cn('text-[10px] px-1 rounded', active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                {layer.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map */}
        <div className="lg:col-span-3">
          <CityMap
            entities={entities}
            center={[36.7538, 3.0588]}
            zoom={12}
            height="calc(100vh - 280px)"
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Side panel */}
        <div className="space-y-3">
          {/* Legend */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">وسيلة الإيضاح</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-primary" /> شاحنة (في الطريق)
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-info" /> حاوية
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-destructive" /> بلاغ نشط
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-success" /> محطة تحويل
              </div>
            </div>
          </div>

          {/* Selected entity */}
          {selectedEntity ? (
            <div className="bg-card rounded-xl border border-border p-4 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium capitalize">{selectedEntity.type}</span>
                <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground text-xs">إغلاق</button>
              </div>
              <div className="font-mono text-xs text-muted-foreground mb-3">{selectedEntity.label}</div>
              <div className="space-y-2 text-xs">
                {selectedEntity.details?.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-medium text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-4 text-center">
              <Navigation className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground">انقر على علامة على الخريطة لعرض التفاصيل</p>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">روابط سريعة</div>
            <div className="space-y-1.5">
              <a href="/dashboard/fleet" className="block text-xs text-primary hover:underline">إدارة الأسطول ←</a>
              <a href="/dashboard/containers" className="block text-xs text-primary hover:underline">حالة الحاويات ←</a>
              <a href="/dashboard/reports" className="block text-xs text-primary hover:underline">بلاغات المواطنين ←</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
