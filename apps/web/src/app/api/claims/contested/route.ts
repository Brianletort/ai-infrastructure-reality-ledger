import { dataResponse, parseLimit } from "../../../../lib/api-response";
import { syntheticLedgerRepository } from "../../../../lib/synthetic-ledger-repository";

export async function GET(request: Request): Promise<Response> {
  const limit = parseLimit(request, 50, 25);
  if (!limit.ok) {
    return limit.response;
  }
  const claims = await syntheticLedgerRepository.listContestedClaims(limit.value);
  return dataResponse(claims, { limit: limit.value });
}
