# ADR 0003: MapLibre, deck.gl, and PMTiles visual core

- Status: Accepted
- Date: 2026-08-29

## Context

The public experience needs open, scalable geographic rendering without coupling the system of
record to a proprietary map runtime. Large read-heavy layers should be distributable as static
artifacts.

## Decision

Use MapLibre for the base map, deck.gl for analytical overlays, and PMTiles for portable,
cache-friendly tile distribution. React Three Fiber is optional for views where three-dimensional
representation adds analytical value; it is not part of the default rendering path.

## Consequences

Tile generation becomes an asynchronous geospatial projection. Accessibility and non-map
alternatives remain mandatory. Any future provider-specific basemap or geocoder must pass source,
security, privacy, performance, and licensing gates.
