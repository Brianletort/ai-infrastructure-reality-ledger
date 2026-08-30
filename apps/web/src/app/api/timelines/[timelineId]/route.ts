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

interface TimelineContext {
  params: Promise<{ timelineId: string }>;
}

export async function GET(_request: Request, context: TimelineContext): Promise<Response> {
  const { timelineId } = await context.params;
  if (!isValidIdentifier(timelineId)) {
    return invalidIdentifier();
  }
  const timeline = deepMetroRepository.getTimeline(timelineId);
  return timeline === null
    ? notFound("timeline")
    : dataResponse(timeline, {
        corpusMode: DEEP_METRO_CORPUS_MODE,
        warning: DEEP_METRO_WARNING,
      });
}
