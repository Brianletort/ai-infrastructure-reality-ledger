import type { FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type {
  GeometryCollection,
  Topology,
} from "topojson-specification";
import countriesTopology from "world-atlas/countries-110m.json" with { type: "json" };

const topology = countriesTopology as unknown as Topology<{
  countries: GeometryCollection;
}>;
const converted = feature(topology, topology.objects.countries);

export const LAND_GEOJSON: FeatureCollection<Geometry> = converted;
