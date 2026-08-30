import {
  dataResponse,
  invalidIdentifier,
  isValidIdentifier,
  notFound,
} from "../../../../lib/api-response";
import { syntheticLedgerRepository } from "../../../../lib/synthetic-ledger-repository";

interface EvidenceContext {
  params: Promise<{ claimId: string }>;
}

export async function GET(_request: Request, context: EvidenceContext): Promise<Response> {
  const { claimId } = await context.params;
  if (!isValidIdentifier(claimId)) {
    return invalidIdentifier();
  }
  const packet = await syntheticLedgerRepository.getEvidencePacket(claimId);
  return packet === null ? notFound("evidence packet") : dataResponse(packet);
}
