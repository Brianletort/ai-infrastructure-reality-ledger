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

interface TimelineHistoryContext {
  params: Promise<{ timelineId: string }>;
}

export async function GET(request: Request, context: TimelineHistoryContext): Promise<Response> {
  const { timelineId } = await context.params;
  if (!isValidIdentifier(timelineId)) {
    return invalidIdentifier();
  }
  const limit = parseLimit(request, 50, 10);
  if (!limit.ok) {
    return limit.response;
  }
  const history = deepMetroRepository.getTimelineHistory(timelineId, limit.value);
  return history === null
    ? notFound("timeline")
    : dataResponse(history, {
        timelineId,
        limit: limit.value,
        corpusMode: DEEP_METRO_CORPUS_MODE,
        warning: DEEP_METRO_WARNING,
      });
}
