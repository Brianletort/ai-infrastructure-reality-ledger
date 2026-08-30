# North America facility inventory methodology

## Status and intended use

This is a first, explicitly incomplete inventory of public data-center records in the United
States, Canada, and Mexico. It is a discovery and evidence layer, not an authoritative registry.
Absence from the inventory is not evidence that a facility does not exist. An OSM record also does
not establish activation, capacity, tenants, operator, or commercial facility type unless the
source explicitly supplies the relevant field.

The checked-in dataset is a deterministic synthetic fallback. It demonstrates the complete
normalization, conflict, coverage, license, and API path without presenting synthetic records as
real.

## Source and license matrix

| Source | Role | Retrieval | Redistribution | License / terms | Key constraint |
| --- | --- | --- | --- | --- | --- |
| OpenStreetMap / Overpass | Inventory | Bounded worker-only adapter | Republish with attribution and share-alike | ODbL 1.0; [OSMF FAQ](https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ) | Public coordinates are generalized; exact source geometry remains restricted |
| PNNL/DOE IM3 Data Center Atlas | Inventory candidate | Reviewed manual import only | Derived-only pending release-specific verification | [OSTI record](https://www.osti.gov/biblio/3017294); ODbL-derived | Machine-readable files may require manual browser download |
| Government of Canada Legacy Data Centres | Context only | No inventory adapter | Republish | [Open Government Licence - Canada](https://open.canada.ca/en/open-government-licence-canada) | Federal legacy/closure metrics, not a commercial-facility registry |
| Mexico historical open-data portal | Context only | No inventory adapter | Link-only | Dataset-specific | No comprehensive official commercial registry has been verified |
| PeeringDB | Prohibited | None | Prohibited | [Acceptable Use Policy](https://www.peeringdb.com/aup) | Adapter policy rejects ingestion absent explicit permission |

The machine-readable policy record is
`sources/manifests/north-america-public-sources.json`.

## Adapter and normalization

`osm-overpass-v1` uses only explicit `telecom=data_center`, `building=data_center`, and
`man_made=data_center` tags. Queries use fixed bounding boxes, a maximum of 2,000 records per
region, a 25-second Overpass query timeout, a 20 MB response ceiling, an identifying user agent,
at least five seconds between requests, and at most two retries. Retrieval is available only in the
Python worker CLI; web request handlers never call Overpass or another third party.

The user agent is assembled from the server-only
`REALITY_LEDGER_OVERPASS_CONTACT_URL` setting. The setting must contain the approved public HTTPS
repository or operator contact path and rejects credentials, query parameters, fragments, local
hosts, and reserved example hosts. The safe default is blank: live ingestion fails closed before a
network request and the refresh records the blocker before generating the explicitly synthetic
fallback. Approval of the exact public URL remains a Tier-3 checklist decision.

Each accepted element produces:

- a canonical facility with explicit nulls and a `missing` list;
- a site with country, macro-region, optional deep-metro bucket, source geometry type, and
  coordinates rounded to 0.01 degree;
- a citation with source ID, OSM element ID, source timestamp, retrieval timestamp, and
  attribution;
- a minimized public tag subset limited to classification, name/operator, broad locality, and
  reference fields;
- a content-addressed restricted evidence record holding exact source coordinates and complete
  source tags.

The public artifact never contains exact source coordinates. Restricted evidence is written under
`.local/restricted-evidence/`, is read-only and content-addressed, and is excluded from version
control.

## Entity resolution and conflicts

Exact OSM identities are deduplicated deterministically. A colocated alias is accepted only when
records have the same normalized non-empty name, the same geometry class, and are within 15
metres of every member in the alias cluster. Accepted aliases are merged into one canonical record;
the lowest OSM type/ID sort key wins deterministically. Alternate display names populate
`facility.aliases`, while every source ID, citation, complete restricted tag set, and restricted
evidence record is retained. Point/area overlaps and other records within 100 metres remain
separate and are emitted as unresolved conflicts, including all source IDs from any merged alias
group. The process does not infer tenants, capacity, activation, operator, or a facility
classification beyond the explicit source tag.

## Refresh

Attempt a bounded live refresh only after configuring the approved contact URL, with automatic
synthetic fallback if configuration is absent or Overpass is unavailable or rate-limited:

```bash
npm run inventory:refresh
```

Generate the deterministic fallback without making a network request:

```bash
npm run inventory:fixture
```

Both commands write:

- `data/odbl/north-america-facilities.json`
- `data/reports/north-america-coverage.json`
- `data/reports/north-america-coverage.md`

The CLI prints real and synthetic record counts and a plain live-retrieval blocker when fallback
occurs. Restricted evidence is written first. Only after every evidence write succeeds are all
three public artifacts staged to temporary files and atomically replaced; replacement failure
rolls back any already-replaced artifact. Do not commit raw PBF files or
`.local/restricted-evidence/`.

## Coverage and limitations

Coverage reports break down records by country, macro-region, metro, operator knownness, geometry,
explicit data-center tag, source, conflict reason, and missing critical fields. Dedicated buckets
are always present for Northern Virginia, Dallas–Fort Worth, Phoenix, and Toronto.

Material limitations:

- OSM tagging is voluntary, incomplete, and geographically uneven.
- Overpass extracts reflect a point in time and can be temporarily unavailable.
- Building, campus, and point representations may overlap.
- Generalized coordinates are not suitable for routing or detailed topology.
- No comprehensive official commercial-facility registry was verified for Canada or Mexico.
- The Canada federal dataset cannot be used as a commercial inventory.

## ODbL compliance

The distributable inventory in `data/odbl/` is separate from Apache-2.0 source code. It is
attributed to © OpenStreetMap contributors and is distributed under ODbL 1.0, including
share-alike obligations. Consumers must preserve attribution and comply with ODbL when publicly
using or redistributing the database or a derivative database.
