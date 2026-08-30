import { dataResponse, parseLimit } from "../../../lib/api-response";
import {
  PUBLIC_INVENTORY_CORPUS_MODE,
  PUBLIC_INVENTORY_WARNING,
  generatedInventoryRepository,
} from "../../../lib/generated-inventory-repository";

const COUNTRY_CODES = new Set(["US", "CA", "MX"]);

export async function GET(request: Request): Promise<Response> {
  const limit = parseLimit(request, 100, 25);
  if (!limit.ok) {
    return limit.response;
  }
  const parameters = new URL(request.url).searchParams;
  const country = parameters.get("country");
  if (country !== null && !COUNTRY_CODES.has(country)) {
    return Response.json({ error: "country must be one of US, CA, or MX" }, { status: 400 });
  }
  const metro = parameters.get("metro");
  if (metro !== null && (metro.trim().length < 2 || metro.length > 100)) {
    return Response.json(
      { error: "metro must contain 2 to 100 characters" },
      { status: 400 },
    );
  }
  const metadata = generatedInventoryRepository.getMetadata();
  const records = generatedInventoryRepository.listPublicInventory({
    country: country as "US" | "CA" | "MX" | null,
    metro: metro?.trim() || null,
    limit: limit.value,
  });
  return dataResponse(records, {
    limit: limit.value,
    country,
    metro: metro?.trim() || null,
    datasetTimestamp: metadata.datasetTimestamp,
    sourceTimestamp: metadata.sourceTimestamp,
    queryVersion: metadata.queryVersion,
    synthetic: metadata.synthetic,
    publicFactApproved: false,
    corpusMode: PUBLIC_INVENTORY_CORPUS_MODE,
    warning: PUBLIC_INVENTORY_WARNING,
    notComplete: true,
    attribution: metadata.attribution,
    license: metadata.license,
  });
}
