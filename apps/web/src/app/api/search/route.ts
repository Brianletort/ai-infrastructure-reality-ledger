import { dataResponse, parseLimit } from "../../../lib/api-response";
import { syntheticLedgerRepository } from "../../../lib/synthetic-ledger-repository";

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return Response.json({ error: "q must contain 2 to 100 characters" }, { status: 400 });
  }
  const limit = parseLimit(request, 25, 10);
  if (!limit.ok) {
    return limit.response;
  }

  const results = await syntheticLedgerRepository.search(query, limit.value);
  return dataResponse(results, { query, limit: limit.value });
}
