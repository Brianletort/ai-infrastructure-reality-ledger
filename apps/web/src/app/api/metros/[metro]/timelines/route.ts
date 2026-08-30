import {
  dataResponse,
  invalidIdentifier,
  isValidIdentifier,
  notFound,
  parseLimit,
} from "../../../../../lib/api-response";
import {
  DEEP_METRO_CORPUS_MODE,
  DEEP_METRO_WARNING,
  deepMetroRepository,
} from "../../../../../lib/deep-metro-repository";

interface MetroTimelinesContext {
  params: Promise<{ metro: string }>;
}

export async function GET(request: Request, context: MetroTimelinesContext): Promise<Response> {
  const { metro } = await context.params;
  if (!isValidIdentifier(metro)) {
    return invalidIdentifier();
  }
  if (deepMetroRepository.getMetroSummary(metro) === null) {
    return notFound("metro");
  }
  const limit = parseLimit(request, 25, 10);
  if (!limit.ok) {
    return limit.response;
  }
  return dataResponse(deepMetroRepository.listMetroTimelines(metro, limit.value), {
    metro,
    limit: limit.value,
    corpusMode: DEEP_METRO_CORPUS_MODE,
    warning: DEEP_METRO_WARNING,
  });
}
