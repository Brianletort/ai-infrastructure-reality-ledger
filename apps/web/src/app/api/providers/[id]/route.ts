import {
  dataResponse,
  invalidIdentifier,
  isValidIdentifier,
  notFound,
} from "../../../../lib/api-response";
import { syntheticLedgerRepository } from "../../../../lib/synthetic-ledger-repository";

interface ProviderContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: ProviderContext): Promise<Response> {
  const { id } = await context.params;
  if (!isValidIdentifier(id)) {
    return invalidIdentifier();
  }
  const provider = await syntheticLedgerRepository.getProvider(id);
  return provider === null ? notFound("provider") : dataResponse(provider);
}
