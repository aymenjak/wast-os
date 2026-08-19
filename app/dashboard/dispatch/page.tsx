'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { vehicles, containers, citizenReports } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { CityMap, type MapEntity } from '@/components/dashboard/city-map';
import {
  Truck, Trash2, AlertTriangle, Layers, Navigation,
} from 'lucide-react';
import type { Vehicle, Container, CitizenReport } from '@/lib/types';

type LayerType = 'trucks' | 'containers' | 'reports';

export default function DispatchPage() {
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
            { label: 'Driver', value: v.driver },
            { label: 'Type', value: v.type },
            { label: 'Zone', value: v.zone },
            { label: 'Status', value: v.status.replace(/_/g, ' ') },
            { label: 'Speed', value: `${v.speed} km/h` },
            { label: 'Fuel', value: `${v.fuel}%` },
            { label: 'Next Stop', value: v.nextStop },
            { label: 'ETA', value: v.eta },
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
            { label: 'Type', value: c.type },
            { label: 'Waste', value: c.wasteType },
            { label: 'Location', value: c.location },
            { label: 'Zone', value: c.zone },
            { label: 'Fill', value: `${c.fillLevel}%` },
            { label: 'Status', value: c.status },
            { label: 'Sensor', value: c.hasSensor ? 'Active' : 'None' },
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
            { label: 'Type', value: r.type.replace(/_/g, ' ') },
            { label: 'Citizen', value: r.citizenName },
            { label: 'Location', value: r.location },
            { label: 'Zone', value: r.zone },
            { label: 'Priority', value: r.priority },
            { label: 'Status', value: r.status.replace(/_/g, ' ') },
            ...(r.assignedTeam ? [{ label: 'Team', value: r.assignedTeam }] : []),
          ],
        });
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

  const selectedEntity = entities.find(e => e.id === selectedId);

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
            <div className="text-xs font-medium text-muted-foreground mb-2">Legend</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-primary" /> Truck (on route)
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-info" /> Container
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-destructive" /> Active report
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-success" /> Transfer station
              </div>
            </div>
          </div>

          {/* Selected entity */}
          {selectedEntity ? (
            <div className="bg-card rounded-xl border border-border p-4 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium capitalize">{selectedEntity.type}</span>
                <button onClick={() => setSelectedId(null)} className="text-muted-foreground hover:text-foreground text-xs">Close</button>
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
              <p className="text-xs text-muted-foreground">Click a marker on the map to see details</p>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Quick Links</div>
            <div className="space-y-1.5">
              <a href="/dashboard/fleet" className="block text-xs text-primary hover:underline">Fleet Management →</a>
              <a href="/dashboard/containers" className="block text-xs text-primary hover:underline">Container Status →</a>
              <a href="/dashboard/reports" className="block text-xs text-primary hover:underline">Citizen Reports →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
