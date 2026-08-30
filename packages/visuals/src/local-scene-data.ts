import type { SceneMarker } from "./scene.js";
import type { GlobeViewState } from "./view-state.js";

export interface GlobeEvent {
  id: string;
  occurredAt: string;
  label: string;
  summary: string;
  state: "announcement" | "permit" | "construction" | "readiness";
  metroSlug: keyof typeof METRO_CAMERA_PRESETS;
  timelineId: string;
  position: readonly [number, number];
  previousPosition: readonly [number, number];
  href: string;
}

export interface GlobeSceneData {
  markers: readonly SceneMarker[];
  events: readonly GlobeEvent[];
  attribution: string;
  syntheticWarning: string;
  coordinateNote: string;
}

export const METRO_CAMERA_PRESETS = {
  "northern-virginia": {
    longitude: -77.4,
    latitude: 39,
    zoom: 6.2,
    bearing: 18,
    pitch: 50,
    selectedMetro: "northern-virginia",
    theme: "obsidian",
  },
  "dallas-fort-worth": {
    longitude: -97,
    latitude: 32.9,
    zoom: 6.1,
    bearing: -12,
    pitch: 48,
    selectedMetro: "dallas-fort-worth",
    theme: "obsidian",
  },
  phoenix: {
    longitude: -112.1,
    latitude: 33.5,
    zoom: 6.2,
    bearing: 14,
    pitch: 49,
    selectedMetro: "phoenix",
    theme: "obsidian",
  },
  toronto: {
    longitude: -79.4,
    latitude: 43.7,
    zoom: 6,
    bearing: -10,
    pitch: 46,
    selectedMetro: "toronto",
    theme: "obsidian",
  },
} as const satisfies Record<string, GlobeViewState>;

const DEEP_METRO_MARKERS: SceneMarker[] = [
  {
    id: "metro-northern-virginia",
    label: "Northern Virginia · synthetic reviewed metro",
    kind: "deep-metro",
    position: [-77.4, 39],
    metroSlug: "northern-virginia",
    href: "/metros/northern-virginia",
  },
  {
    id: "metro-dallas-fort-worth",
    label: "Dallas–Fort Worth · synthetic reviewed metro",
    kind: "deep-metro",
    position: [-97, 32.9],
    metroSlug: "dallas-fort-worth",
    href: "/metros/dallas-fort-worth",
  },
  {
    id: "metro-phoenix",
    label: "Phoenix · synthetic reviewed metro",
    kind: "deep-metro",
    position: [-112.1, 33.5],
    metroSlug: "phoenix",
    href: "/metros/phoenix",
  },
  {
    id: "metro-toronto",
    label: "Toronto · synthetic reviewed metro",
    kind: "deep-metro",
    position: [-79.4, 43.7],
    metroSlug: "toronto",
    href: "/metros/toronto",
  },
];

const INVENTORY_MARKERS: SceneMarker[] = [
  {
    id: "facility-osm-43681388092c8c3a7e56",
    label: "Synthetic Ontario Compute · approximate synthetic inventory location",
    kind: "inventory",
    position: [-79.4, 43.7],
    metroSlug: "toronto",
    href: "/facilities/facility-osm-43681388092c8c3a7e56",
  },
  {
    id: "facility-osm-316add245b25fd1d87d4",
    label: "Synthetic Valle Compute · approximate synthetic inventory location",
    kind: "inventory",
    position: [-99.1, 19.4],
    metroSlug: "mexico-city",
    href: "/facilities/facility-osm-316add245b25fd1d87d4",
  },
  {
    id: "facility-osm-760f52f356d7d3dc9fc1",
    label: "Synthetic Potomac Compute · approximate synthetic inventory location",
    kind: "inventory",
    position: [-77.5, 39],
    metroSlug: "northern-virginia",
    href: "/facilities/facility-osm-760f52f356d7d3dc9fc1",
  },
  {
    id: "facility-osm-5ab9532adbaee0890235",
    label: "Synthetic Trinity Compute · approximate synthetic inventory location",
    kind: "inventory",
    position: [-97, 32.9],
    metroSlug: "dallas-fort-worth",
    href: "/facilities/facility-osm-5ab9532adbaee0890235",
  },
  {
    id: "facility-osm-1072d5143dff1517cd3a",
    label: "Synthetic Sonoran Compute · approximate synthetic inventory location",
    kind: "inventory",
    position: [-112.1, 33.5],
    metroSlug: "phoenix",
    href: "/facilities/facility-osm-1072d5143dff1517cd3a",
  },
  {
    id: "facility-osm-f5830eec8a232d60acf4",
    label: "Synthetic Potomac Compute area · approximate synthetic inventory location",
    kind: "inventory",
    position: [-77.4, 38.9],
    metroSlug: "northern-virginia",
    href: "/facilities/facility-osm-f5830eec8a232d60acf4",
  },
];

const EVENTS: GlobeEvent[] = [
  {
    id: "synthetic-northern-virginia-01-event-01-announcement",
    occurredAt: "2023-02-02T00:00:00.000Z",
    label: "Northern Virginia announcement review",
    summary: "Synthetic announcement scenario entered the reviewed local timeline.",
    state: "announcement",
    metroSlug: "northern-virginia",
    timelineId: "synthetic-northern-virginia-01",
    position: [-77.4, 39],
    previousPosition: [-98, 39],
    href: "/timelines/synthetic-northern-virginia-01",
  },
  {
    id: "synthetic-northern-virginia-02-event-02-permit",
    occurredAt: "2023-03-06T00:00:00.000Z",
    label: "Northern Virginia permit review",
    summary: "Synthetic permit scenario became the next reviewed state change.",
    state: "permit",
    metroSlug: "northern-virginia",
    timelineId: "synthetic-northern-virginia-02",
    position: [-77.5, 39],
    previousPosition: [-77.4, 39],
    href: "/timelines/synthetic-northern-virginia-02",
  },
  {
    id: "synthetic-dallas-fort-worth-01-event-01-announcement",
    occurredAt: "2023-06-01T00:00:00.000Z",
    label: "Dallas–Fort Worth announcement review",
    summary: "Synthetic announcement scenario entered the reviewed local timeline.",
    state: "announcement",
    metroSlug: "dallas-fort-worth",
    timelineId: "synthetic-dallas-fort-worth-01",
    position: [-97, 32.9],
    previousPosition: [-77.5, 39],
    href: "/timelines/synthetic-dallas-fort-worth-01",
  },
  {
    id: "synthetic-dallas-fort-worth-02-event-02-construction",
    occurredAt: "2023-07-10T00:00:00.000Z",
    label: "Dallas–Fort Worth construction review",
    summary: "Synthetic construction scenario became the next reviewed state change.",
    state: "construction",
    metroSlug: "dallas-fort-worth",
    timelineId: "synthetic-dallas-fort-worth-02",
    position: [-97.1, 32.8],
    previousPosition: [-97, 32.9],
    href: "/timelines/synthetic-dallas-fort-worth-02",
  },
  {
    id: "synthetic-phoenix-01-event-01-announcement",
    occurredAt: "2023-09-01T00:00:00.000Z",
    label: "Phoenix announcement review",
    summary: "Synthetic announcement scenario entered the reviewed local timeline.",
    state: "announcement",
    metroSlug: "phoenix",
    timelineId: "synthetic-phoenix-01",
    position: [-112.1, 33.5],
    previousPosition: [-97.1, 32.8],
    href: "/timelines/synthetic-phoenix-01",
  },
  {
    id: "synthetic-phoenix-02-event-03-readiness",
    occurredAt: "2023-10-18T00:00:00.000Z",
    label: "Phoenix readiness review",
    summary: "Synthetic readiness scenario became the next reviewed state change.",
    state: "readiness",
    metroSlug: "phoenix",
    timelineId: "synthetic-phoenix-02",
    position: [-112, 33.4],
    previousPosition: [-112.1, 33.5],
    href: "/timelines/synthetic-phoenix-02",
  },
  {
    id: "synthetic-toronto-01-event-01-announcement",
    occurredAt: "2023-12-01T00:00:00.000Z",
    label: "Toronto announcement review",
    summary: "Synthetic announcement scenario entered the reviewed local timeline.",
    state: "announcement",
    metroSlug: "toronto",
    timelineId: "synthetic-toronto-01",
    position: [-79.4, 43.7],
    previousPosition: [-112, 33.4],
    href: "/timelines/synthetic-toronto-01",
  },
  {
    id: "synthetic-toronto-02-event-02-permit",
    occurredAt: "2024-01-12T00:00:00.000Z",
    label: "Toronto permit review",
    summary: "Synthetic permit scenario became the next reviewed state change.",
    state: "permit",
    metroSlug: "toronto",
    timelineId: "synthetic-toronto-02",
    position: [-79.3, 43.6],
    previousPosition: [-79.4, 43.7],
    href: "/timelines/synthetic-toronto-02",
  },
];

export const LOCAL_GLOBE_SCENE: GlobeSceneData = {
  markers: [...DEEP_METRO_MARKERS, ...INVENTORY_MARKERS],
  events: EVENTS,
  attribution:
    "Land geometry: Natural Earth public-domain data via world-atlas. Inventory fixtures: © OpenStreetMap contributors, ODbL 1.0.",
  syntheticWarning:
    "All metro, facility, and event content in this scene is synthetic or fixture-derived reviewed beta data.",
  coordinateNote:
    "Approximate synthetic locations are rounded for orientation and are not restricted site coordinates.",
};
