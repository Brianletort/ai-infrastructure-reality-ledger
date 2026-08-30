import {
  dataResponse,
  invalidIdentifier,
  isValidIdentifier,
  notFound,
} from "../../../../lib/api-response";
import {
  DEEP_METRO_CORPUS_MODE,
  DEEP_METRO_WARNING,
  deepMetroRepository,
} from "../../../../lib/deep-metro-repository";

interface EvidencePacketContext {
  params: Promise<{ packetId: string }>;
}

export async function GET(_request: Request, context: EvidencePacketContext): Promise<Response> {
  const { packetId } = await context.params;
  if (!isValidIdentifier(packetId)) {
    return invalidIdentifier();
  }
  const packet = deepMetroRepository.getEvidencePacket(packetId);
  return packet === null
    ? notFound("evidence packet")
    : dataResponse(packet, {
        corpusMode: DEEP_METRO_CORPUS_MODE,
        warning: DEEP_METRO_WARNING,
      });
}
