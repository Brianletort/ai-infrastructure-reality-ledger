import {
  dataResponse,
  invalidIdentifier,
  isValidIdentifier,
  notFound,
} from "../../../../lib/api-response";
import { syntheticLedgerRepository } from "../../../../lib/synthetic-ledger-repository";

interface FacilityContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: FacilityContext): Promise<Response> {
  const { id } = await context.params;
  if (!isValidIdentifier(id)) {
    return invalidIdentifier();
  }
  const facility = await syntheticLedgerRepository.getFacility(id);
  return facility === null ? notFound("facility") : dataResponse(facility);
}
