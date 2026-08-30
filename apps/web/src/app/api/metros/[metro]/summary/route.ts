import {
  dataResponse,
  invalidIdentifier,
  isValidIdentifier,
  notFound,
} from "../../../../../lib/api-response";
import {
  DEEP_METRO_CORPUS_MODE,
  DEEP_METRO_WARNING,
  deepMetroRepository,
} from "../../../../../lib/deep-metro-repository";

interface MetroSummaryContext {
  params: Promise<{ metro: string }>;
}

export async function GET(_request: Request, context: MetroSummaryContext): Promise<Response> {
  const { metro } = await context.params;
  if (!isValidIdentifier(metro)) {
    return invalidIdentifier();
  }
  const summary = deepMetroRepository.getMetroSummary(metro);
  return summary === null
    ? notFound("metro")
    : dataResponse(summary, {
        corpusMode: DEEP_METRO_CORPUS_MODE,
        warning: DEEP_METRO_WARNING,
      });
}
