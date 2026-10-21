import type { z } from "zod";

const NO_STORE = { "cache-control": "no-store" };

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

export function errorResponse(status: number, message: string): Response {
  return json({ error: message }, status);
}

export function rateLimited(retryAfterSeconds: number): Response {
  const res = errorResponse(429, "Too many requests. Please wait a moment and try again.");
  res.headers.set("retry-after", String(retryAfterSeconds));
  return res;
}

type ReadResult<T> = { ok: true; data: T } | { ok: false; response: Response };

const reject = (status: number, message: string) =>
  ({ ok: false, response: errorResponse(status, message) }) as const;

/** The body as text, or null when it is over `maxBytes` (checked before and after reading). */
async function boundedText(request: Request, maxBytes: number): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) return null;
  const body = await request.text();
  return new TextEncoder().encode(body).length > maxBytes ? null : body;
}

function tryParseJson(body: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(body) as unknown };
  } catch {
    return { ok: false };
  }
}

/** First validation issue as "field: message", without exposing internals. */
function describeIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  const field = issue?.path.join(".") || "body";
  return `${field}: ${issue?.message ?? "invalid"}`;
}

/** Parses and validates a JSON request body. Errors name the field, never internals. */
export async function readJson<S extends z.ZodType>(
  request: Request,
  schema: S,
  maxBytes = 64_000,
): Promise<ReadResult<z.infer<S>>> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return reject(415, "Send JSON with Content-Type: application/json");
  }
  const body = await boundedText(request, maxBytes);
  if (body === null) return reject(413, "Request is too large");

  const json = tryParseJson(body);
  if (!json.ok) return reject(400, "Request body must be valid JSON");

  const parsed = schema.safeParse(json.value);
  return parsed.success
    ? { ok: true, data: parsed.data }
    : reject(400, describeIssue(parsed.error));
}
