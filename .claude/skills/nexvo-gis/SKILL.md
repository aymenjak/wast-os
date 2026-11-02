---
name: nexvo-gis
description: Spatial data, maps, service zones, duplicate detection and route planning in NEXVO (PostGIS, Leaflet, provider interfaces). Use for anything involving coordinates, maps or routing.
---
# NEXVO GIS

## Procedure
1. Store points as `latitude/longitude DECIMAL(9,6)`; the trigger `nexvo_sync_geog` maintains `geog geography(Point,4326)` (GIST indexed). Never write `geog` from code.
2. Spatial queries via tagged `$queryRaw` with `ST_DWithin`/`ST_Distance` on `geog` (metres). Always constrain by `organizationId`.
3. Maps: `components/map` (`LeafletMap`, `LocationPicker`); keep coordinates typable; container is LTR.
4. Tiles from `NEXT_PUBLIC_MAP_TILE_URL`. Public OSM tiles are dev/pilot only; never bulk-geocode against public Nominatim (S-60/S-61).
5. Routing through `RoutingProvider` (`server/routing.ts`); label straight-line results as estimates.
6. Public maps: verified reports only, coordinates rounded to 3 decimals, no free text.

## Verification
Integration test with points inside and outside the radius (see `civic-flow.test.ts`).
