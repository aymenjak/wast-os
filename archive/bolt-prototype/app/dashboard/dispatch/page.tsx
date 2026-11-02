'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { vehicles, containers, citizenReports } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import {
  Truck, Trash2, MapPin, AlertTriangle, Filter,
  Navigation, Layers, Maximize2, Crosshair, Eye,
} from 'lucide-react';
import type { Vehicle, Container, CitizenReport } from '@/lib/types';

type LayerType = 'trucks' | 'containers' | 'reports';
type MapEntity = { type: LayerType; data: Vehicle | Container | CitizenReport; x: number; y: number };

export default function DispatchPage() {
  const [activeLayers, setActiveLayers] = useState<Record<LayerType, boolean>>({
    trucks: true,
    containers: true,
    reports: true,
  });
  const [selected, setSelected] = useState<MapEntity | null>(null);

  // Normalize lat/lng to percentage positions on the map canvas
  const normalizePos = (lat: number, lng: number) => {
    const latMin = 36.71, latMax = 36.80;
    const lngMin = 3.01, lngMax = 3.11;
    const x = ((lng - lngMin) / (lngMax - lngMin)) * 100;
    const y = ((latMax - lat) / (latMax - latMin)) * 100;
    return { x: Math.max(2, Math.min(96, x)), y: Math.max(5, Math.min(92, y)) };
  };

  const entities: MapEntity[] = useMemo(() => {
    const result: MapEntity[] = [];
    if (activeLayers.trucks) {
      vehicles.filter(v => v.status === 'ON_ROUTE' || v.status === 'LOADING').forEach(v => {
        const pos = normalizePos(v.lat, v.lng);
        result.push({ type: 'trucks', data: v, x: pos.x, y: pos.y });
      });
    }
    if (activeLayers.containers) {
      containers.forEach(c => {
        const pos = normalizePos(c.lat, c.lng);
        result.push({ type: 'containers', data: c, x: pos.x, y: pos.y });
      });
    }
    if (activeLayers.reports) {
      citizenReports.filter(r => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(r.status)).forEach(r => {
        const pos = normalizePos(r.lat, r.lng);
        result.push({ type: 'reports', data: r, x: pos.x, y: pos.y });
      });
    }
    return result;
  }, [activeLayers]);

  const counts = {
    trucks: vehicles.filter(v => v.status === 'ON_ROUTE' || v.status === 'LOADING').length,
    containers: containers.length,
    reports: citizenReports.filter(r => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(r.status)).length,
  };

  const layerConfig: { key: LayerType; label: string; icon: typeof Truck; color: string; count: number }[] = [
    { key: 'trucks', label: 'Trucks', icon: Truck, color: 'bg-primary', count: counts.trucks },
    { key: 'containers', label: 'Containers', icon: Trash2, color: 'bg-info', count: counts.containers },
    { key: 'reports', label: 'Reports', icon: AlertTriangle, color: 'bg-destructive', count: counts.reports },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader title="Live Dispatch Map" description="Real-time fleet, container, and report locations across the city">
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg bg-success/10 text-success text-sm font-medium">
          <span className="relative w-2 h-2 rounded-full bg-success">
            <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
          </span>
          Live Tracking
        </div>
      </PageHeader>

      {/* Layer toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground mr-2">
          <Layers className="w-4 h-4" /> Layers:
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

      {/* Map canvas */}
      <div className="relative bg-card rounded-xl border border-border overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
        {/* Grid background */}
        <div className="absolute inset-0 bg-grid opacity-50" />

        {/* Map roads simulation */}
        <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
          <defs>
            <pattern id="roads" x="0" y="0" width="20%" height="25%" patternUnits="userSpaceOnUse">
              <path d="M 0 50 Q 50 30 100 50 Q 50 70 0 50" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" />
              <line x1="50" y1="0" x2="50" y2="100" stroke="hsl(var(--muted-foreground))" strokeWidth="0.3" strokeDasharray="2 4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#roads)" />
        </svg>

        {/* Zone labels */}
        {[
          { label: 'Zone 1 — Centre', x: 50, y: 40 },
          { label: 'Zone 2 — Nord', x: 30, y: 15 },
          { label: 'Zone 3 — Est', x: 75, y: 35 },
          { label: 'Zone 4 — Sud', x: 55, y: 72 },
          { label: 'Zone 5 — Ouest', x: 20, y: 55 },
        ].map((z) => (
          <div
            key={z.label}
            className="absolute text-[10px] font-medium text-muted-foreground/60 pointer-events-none"
            style={{ left: `${z.x}%`, top: `${z.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            {z.label}
          </div>
        ))}

        {/* Entities */}
        {entities.map((entity, i) => {
          const isSelected = selected?.type === entity.type && (selected.data as { id: string }).id === (entity.data as { id: string }).id;
          let marker: React.ReactNode;

          if (entity.type === 'trucks') {
            const v = entity.data as Vehicle;
            marker = (
              <div className={cn(
                'relative flex items-center justify-center w-7 h-7 rounded-full transition-all',
                isSelected ? 'bg-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-card scale-110' : 'bg-primary hover:scale-110'
              )}>
                {v.status === 'ON_ROUTE' && (
                  <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
                )}
                <Truck className="w-3.5 h-3.5 text-white relative z-10" />
              </div>
            );
          } else if (entity.type === 'containers') {
            const c = entity.data as Container;
            const color = c.fillLevel >= 90 ? 'bg-destructive' : c.fillLevel >= 70 ? 'bg-warning' : 'bg-info';
            marker = (
              <div className={cn(
                'relative flex items-center justify-center w-5 h-5 rounded transition-all',
                isSelected ? 'ring-2 ring-offset-2 ring-offset-card scale-125' : 'hover:scale-110',
                color,
                isSelected && c.fillLevel >= 90 ? 'ring-destructive' : isSelected && c.fillLevel >= 70 ? 'ring-warning' : 'ring-info'
              )}>
                <Trash2 className="w-3 h-3 text-white" />
              </div>
            );
          } else {
            marker = (
              <div className={cn(
                'relative flex items-center justify-center w-5 h-5 rounded-full transition-all',
                isSelected ? 'bg-destructive ring-2 ring-destructive/30 ring-offset-2 ring-offset-card scale-125' : 'bg-destructive hover:scale-110'
              )}>
                <AlertTriangle className="w-3 h-3 text-white" />
                <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-30" />
              </div>
            );
          }

          return (
            <button
              key={`${entity.type}-${(entity.data as { id: string }).id}-${i}`}
              className="absolute z-10 group"
              style={{ left: `${entity.x}%`, top: `${entity.y}%`, transform: 'translate(-50%, -50%)' }}
              onClick={() => setSelected(entity)}
            >
              {marker}
            </button>
          );
        })}

        {/* Map controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-20">
          <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-card border border-border shadow-sm hover:bg-muted transition-colors">
            <Maximize2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-card border border-border shadow-sm hover:bg-muted transition-colors">
            <Crosshair className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg border border-border p-3 z-20">
          <div className="text-xs font-medium text-muted-foreground mb-2">Legend</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded-full bg-primary" /> Truck (on route)
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded bg-info" /> Container (normal)
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded bg-warning" /> Container (high fill)
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 rounded bg-destructive" /> Container full / Report
            </div>
          </div>
        </div>

        {/* Selected entity info panel */}
        {selected && (
          <div className="absolute top-4 left-4 w-72 bg-card rounded-xl border border-border shadow-lg z-20 animate-slide-up">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selected.type === 'trucks' && <Truck className="w-4 h-4 text-primary" />}
                  {selected.type === 'containers' && <Trash2 className="w-4 h-4 text-info" />}
                  {selected.type === 'reports' && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  <span className="text-sm font-medium capitalize">{selected.type.replace(/_/g, ' ')}</span>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xs">Close</button>
              </div>
            </div>
            <div className="p-4 space-y-2 text-xs">
              {selected.type === 'trucks' && (() => {
                const v = selected.data as Vehicle;
                return (
                  <>
                    <InfoRow label="Plate" value={v.plate} />
                    <InfoRow label="Type" value={v.type} />
                    <InfoRow label="Driver" value={v.driver} />
                    <InfoRow label="Zone" value={v.zone} />
                    <InfoRow label="Status" value={v.status.replace(/_/g, ' ')} />
                    <InfoRow label="Speed" value={`${v.speed} km/h`} />
                    <InfoRow label="Next Stop" value={v.nextStop} />
                    <InfoRow label="ETA" value={v.eta} />
                    <InfoRow label="Fuel" value={`${v.fuel}%`} />
                  </>
                );
              })()}
              {selected.type === 'containers' && (() => {
                const c = selected.data as Container;
                return (
                  <>
                    <InfoRow label="ID" value={c.containerId} />
                    <InfoRow label="Type" value={c.type} />
                    <InfoRow label="Waste Type" value={c.wasteType} />
                    <InfoRow label="Location" value={c.location} />
                    <InfoRow label="Zone" value={c.zone} />
                    <InfoRow label="Fill Level" value={`${c.fillLevel}%`} />
                    <InfoRow label="Status" value={c.status} />
                    <InfoRow label="Sensor" value={c.hasSensor ? 'Active' : 'None'} />
                  </>
                );
              })()}
              {selected.type === 'reports' && (() => {
                const r = selected.data as CitizenReport;
                return (
                  <>
                    <InfoRow label="Report ID" value={r.reportId} />
                    <InfoRow label="Type" value={r.type.replace(/_/g, ' ')} />
                    <InfoRow label="Citizen" value={r.citizenName} />
                    <InfoRow label="Location" value={r.location} />
                    <InfoRow label="Zone" value={r.zone} />
                    <InfoRow label="Priority" value={r.priority} />
                    <InfoRow label="Status" value={r.status.replace(/_/g, ' ')} />
                    {r.assignedTeam && <InfoRow label="Team" value={r.assignedTeam} />}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
