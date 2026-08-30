import {
  dataResponse,
  invalidIdentifier,
  isValidIdentifier,
  parseLimit,
} from "../../../../../lib/api-response";
import { syntheticLedgerRepository } from "../../../../../lib/synthetic-ledger-repository";

interface TimelineContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: TimelineContext): Promise<Response> {
  const { id } = await context.params;
  if (!isValidIdentifier(id)) {
    return invalidIdentifier();
  }
  const limit = parseLimit(request, 100, 25);
  if (!limit.ok) {
    return limit.response;
  }
  const timeline = await syntheticLedgerRepository.getTimeline(id, limit.value);
  return dataResponse(timeline, { entityId: id, limit: limit.value });
}
