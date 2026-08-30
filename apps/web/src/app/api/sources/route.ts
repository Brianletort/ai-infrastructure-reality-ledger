import { dataResponse, parseLimit } from "../../../lib/api-response";
import { generatedInventoryRepository } from "../../../lib/generated-inventory-repository";

export async function GET(request: Request): Promise<Response> {
  const limit = parseLimit(request, 50, 25);
  if (!limit.ok) {
    return limit.response;
  }
  const manifests = generatedInventoryRepository.listSourceManifests(limit.value);
  return dataResponse(manifests, { limit: limit.value });
}
