export type SemanticLayerId =
  | "land-outline"
  | "graticule"
  | "deep-metro"
  | "inventory-point"
  | "state-arc"
  | "event-pulse";

export interface LayerSemantic {
  label: string;
  meaning: string;
  doesNotMean: readonly string[];
}

const NON_QUANTITATIVE_CLAIMS = [
  "capacity",
  "traffic",
  "power flow",
  "activation",
  "certainty",
] as const;

export function getLayerSemantic(layerId: SemanticLayerId): LayerSemantic {
  switch (layerId) {
    case "land-outline":
      return {
        label: "Public-domain land outline",
        meaning: "Geographic orientation only.",
        doesNotMean: NON_QUANTITATIVE_CLAIMS,
      };
    case "graticule":
      return {
        label: "Reference grid",
        meaning: "Geographic orientation only.",
        doesNotMean: NON_QUANTITATIVE_CLAIMS,
      };
    case "deep-metro":
      return {
        label: "Synthetic reviewed metro",
        meaning: "A metro represented in the local synthetic review corpus.",
        doesNotMean: NON_QUANTITATIVE_CLAIMS,
      };
    case "inventory-point":
      return {
        label: "Synthetic inventory record",
        meaning: "An approximate location from the local fixture-derived inventory.",
        doesNotMean: NON_QUANTITATIVE_CLAIMS,
      };
    case "state-arc":
      return {
        label: "Reviewed state transition",
        meaning: "A sequence between two reviewed changes in a synthetic timeline.",
        doesNotMean: NON_QUANTITATIVE_CLAIMS,
      };
    case "event-pulse":
      return {
        label: "What changed",
        meaning: "A reviewed change at the selected timeline instant.",
        doesNotMean: NON_QUANTITATIVE_CLAIMS,
      };
    default: {
      const exhaustive: never = layerId;
      return exhaustive;
    }
  }
}

const RESTRICTED_KEYS = new Set([
  "exactgeometry",
  "exactcoordinates",
  "restrictedcoordinates",
  "sourcetags",
  "rawsourcetags",
  "streetaddress",
]);

function containsRestrictedField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsRestrictedField);
  }
  if (value === null || typeof value !== "object") {
    return false;
  }
  return Object.entries(value).some(
    ([key, child]) =>
      RESTRICTED_KEYS.has(key.replace(/[^a-z]/gi, "").toLowerCase()) ||
      containsRestrictedField(child),
  );
}

export function assertPublicSceneData(value: unknown): boolean {
  return !containsRestrictedField(value);
}
