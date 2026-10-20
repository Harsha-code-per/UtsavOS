import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorResponse, rateLimited, readJson } from "./http";

const Schema = z.object({ name: z.string().min(1) });

const post = (
  body: string,
  headers: Record<string, string> = { "content-type": "application/json" },
) => new Request("http://x/api", { method: "POST", body, headers });

describe("readJson", () => {
  it("returns typed data for a valid body", async () => {
    const result = await readJson(post('{"name":"Meera"}'), Schema);
    expect(result).toEqual({ ok: true, data: { name: "Meera" } });
  });

  it("rejects non-JSON content types with 415", async () => {
    const result = await readJson(post("name=x", { "content-type": "text/plain" }), Schema);
    expect(!result.ok && result.response.status).toBe(415);
  });

  it("rejects bodies over the size limit with 413", async () => {
    const result = await readJson(post(JSON.stringify({ name: "x".repeat(200) })), Schema, 100);
    expect(!result.ok && result.response.status).toBe(413);
  });

  it("rejects malformed JSON with 400", async () => {
    const result = await readJson(post("{nope"), Schema);
    expect(!result.ok && result.response.status).toBe(400);
  });

  it("rejects schema violations with a short message naming the field", async () => {
    const result = await readJson(post('{"name":""}'), Schema);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    expect((await result.response.json()).error).toMatch(/^name: /);
  });
});

describe("errorResponse", () => {
  it("is JSON and never cached", async () => {
    const res = errorResponse(502, "Gemini is unavailable");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: "Gemini is unavailable" });
  });
});

describe("rateLimited", () => {
  it("returns 429 with Retry-After", () => {
    const res = rateLimited(30);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("30");
  });
});
