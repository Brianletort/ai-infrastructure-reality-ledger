export type LimitResult = { ok: true; value: number } | { ok: false; response: Response };

export function parseLimit(request: Request, maximum: number, defaultValue: number): LimitResult {
  const raw = new URL(request.url).searchParams.get("limit");
  if (raw === null) {
    return { ok: true, value: defaultValue };
  }
  if (!/^\d+$/.test(raw)) {
    return {
      ok: false,
      response: Response.json(
        { error: `limit must be an integer between 1 and ${maximum}` },
        { status: 400 },
      ),
    };
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    return {
      ok: false,
      response: Response.json(
        { error: `limit must be an integer between 1 and ${maximum}` },
        { status: 400 },
      ),
    };
  }
  return { ok: true, value };
}

export function isValidIdentifier(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
}

export function invalidIdentifier(): Response {
  return Response.json({ error: "identifier is invalid" }, { status: 400 });
}

export function notFound(resource: string): Response {
  return Response.json({ error: `${resource} not found` }, { status: 404 });
}

export function dataResponse<T>(data: T, meta: Record<string, unknown> = {}): Response {
  return Response.json({
    data,
    meta: { ...meta, explicitMissingness: true },
  });
}
