import { afterEach, describe, expect, it, vi } from "vitest";
import { localToday } from "@/lib/domain/timeline";
import { weddingBrief, weddingPlan } from "@/test/fixtures";
import { api, errorMessage, isAbort } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("posts JSON with the person's local date and returns the body", async () => {
    const fetchMock = vi.fn(async () => Response.json({ patch: { city: "Pune" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.parseBrief("Pune birthday")).resolves.toEqual({ patch: { city: "Pune" } });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/brief");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(JSON.parse(String(init.body))).toEqual({
      description: "Pune birthday",
      today: localToday(),
    });
  });

  it("refuses a success response that doesn't match the expected shape", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ reply: 42 }));
    await expect(api.chat(weddingPlan, [{ role: "user", text: "hi" }])).rejects.toThrow(
      "Something went wrong. Please try again.",
    );
  });

  it("surfaces the server's error message", async () => {
    vi.stubGlobal("fetch", async () =>
      Response.json({ error: "brief.guests: too small" }, { status: 400 }),
    );
    await expect(api.draftPlan(weddingBrief)).rejects.toThrow("brief.guests: too small");
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>502</html>", { status: 502 }));
    await expect(api.ideas(weddingBrief)).rejects.toThrow(
      "Something went wrong. Please try again.",
    );
  });

  it("explains network failures in plain words", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(api.parseBrief("hello")).rejects.toThrow(/offline/);
  });

  it("lets aborts through untouched so callers can tell them apart", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("aborted", "AbortError");
    });
    await expect(api.draftPlan(weddingBrief)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("reads an error's message, with a plain fallback for anything else", () => {
    expect(errorMessage(new Error("Quota reached"))).toBe("Quota reached");
    expect(errorMessage("boom")).toBe("Something went wrong. Please try again.");
  });

  it("recognises aborted requests only", () => {
    expect(isAbort(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isAbort(new Error("offline"))).toBe(false);
    expect(isAbort(undefined)).toBe(false);
  });
});
