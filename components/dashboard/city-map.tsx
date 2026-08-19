'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons (webpack/Next.js breaks leaflet's asset paths)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface MapEntity {
  id: string;
  lat: number;
  lng: number;
  type: 'truck' | 'container' | 'report' | 'station';
  label: string;
  details?: { label: string; value: string }[];
}

function createIcon(color: string, emoji: string) {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="
      background:${color};
      width:28px;height:28px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const icons = {
  truck: createIcon('hsl(217, 91%, 60%)', '\u{1F69B}'),
  container: createIcon('hsl(200, 90%, 50%)', '\u{1F5D1}'),
  report: createIcon('hsl(0, 72%, 51%)', '\u{26A0}'),
  station: createIcon('hsl(160, 84%, 39%)', '\u{21C4}'),
};

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

interface CityMapProps {
  entities: MapEntity[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export function CityMap({
  entities,
  center = [36.7538, 3.0588],
  zoom = 12,
  height = '500px',
  selectedId,
  onSelect,
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Ensure leaflet CSS is loaded
    if (containerRef.current) {
      containerRef.current.style.height = height;
    }
  }, [height]);

  return (
    <div ref={containerRef} style={{ height }} className="rounded-xl overflow-hidden border border-border">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <Recenter center={center} zoom={zoom} />
        {entities.map((entity) => (
          <Marker
            key={entity.id}
            position={[entity.lat, entity.lng]}
            icon={icons[entity.type]}
            eventHandlers={{
              click: () => onSelect?.(entity.id),
            }}
          >
            <Popup>
              <div style={{ minWidth: '180px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{entity.label}</div>
                {entity.details?.map((d, i) => (
                  <div key={i} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666' }}>{d.label}:</span>
                    <span style={{ fontWeight: 500 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
