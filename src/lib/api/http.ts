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

/** Parses and validates a JSON request body. Errors name the field, never internals. */
export async function readJson<S extends z.ZodType>(
  request: Request,
  schema: S,
  maxBytes = 64_000,
): Promise<ReadResult<z.infer<S>>> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return {
      ok: false,
      response: errorResponse(415, "Send JSON with Content-Type: application/json"),
    };
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  const body = declared > maxBytes ? "" : await request.text();
  if (declared > maxBytes || new TextEncoder().encode(body).length > maxBytes) {
    return { ok: false, response: errorResponse(413, "Request is too large") };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return { ok: false, response: errorResponse(400, "Request body must be valid JSON") };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".") || "body";
    return { ok: false, response: errorResponse(400, `${field}: ${issue?.message ?? "invalid"}`) };
  }
  return { ok: true, data: parsed.data };
}
