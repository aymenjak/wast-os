'use client';

import dynamic from 'next/dynamic';
import type { MapEntity, CityMapProps } from './city-map-inner';

const CityMapInner = dynamic(() => import('./city-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-border bg-muted/30 flex items-center justify-center" style={{ height: '400px' }}>
      <div className="text-sm text-muted-foreground">Loading map...</div>
    </div>
  ),
});

export type { MapEntity, CityMapProps };

export function CityMap(props: CityMapProps) {
  return <CityMapInner {...props} />;
}
