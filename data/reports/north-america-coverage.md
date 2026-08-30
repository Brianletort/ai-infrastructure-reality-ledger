# North America facility inventory coverage

> **This inventory is not complete.** Absence from this dataset is not evidence that a facility does not exist.

- Dataset timestamp: `2026-08-29T23:37:14.144296Z`
- Source timestamp: `2026-08-29T20:30:00Z`
- Query/version: `osm-overpass-na-v1`
- Inventory mode: deterministic synthetic fallback
- Public record count: **6**
- Unresolved conflict count: **1**

## Coverage by country

- CA: 1
- MX: 1
- US: 4

## Deep-metro buckets

- Northern Virginia: 2 records; 2 conflicts; 1 with explicit operator
- Dallas–Fort Worth: 1 records; 0 conflicts; 0 with explicit operator
- Phoenix: 1 records; 0 conflicts; 1 with explicit operator
- Toronto: 1 records; 0 conflicts; 1 with explicit operator

## Operator/provider knownness

- known: 3
- unknown: 3

## Geometry type

- area: 1
- point: 5

## Explicit facility tag

- building=data_center: 2
- man_made=data_center: 1
- telecom=data_center: 3

## Missing critical fields

- name: 0
- operator: 3
- capacityMw: 6
- lifecycleState: 6

## Known limitations

- OpenStreetMap tagging is voluntary and uneven; untagged facilities are absent.
- Coordinates are generalized to 0.01 degree in distributable data and public APIs.
- OSM presence does not establish operator, tenant, capacity, facility type beyond explicit source tags, activation, or lifecycle state.
- Overlapping point, building, and campus representations remain unresolved conflicts.
- The Canada federal legacy dataset is contextual only; no official comprehensive commercial registry was verified for Canada or Mexico.
- Live ingestion blocker recorded for this generation: bounded Overpass retrieval failed: HTTP Error 429: Too Many Requests

ODbL attribution: © OpenStreetMap contributors. The distributable inventory is provided under ODbL 1.0 and retains share-alike obligations.
