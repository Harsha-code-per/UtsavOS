import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPlanner } from "@/lib/ai/mock";
import { getPlanner } from "@/lib/ai/planner";
import { AiError } from "@/lib/ai/types";
import { postJson, weddingBrief } from "@/test/fixtures";
import { POST } from "./route";

vi.mock("@/lib/ai/planner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/planner")>()),
  getPlanner: vi.fn(),
}));
const planner = vi.mocked(getPlanner);

beforeEach(() => {
  planner.mockReturnValue(mockPlanner);
});

describe("POST /api/ideas", () => {
  it("returns personalized ideas with their sources", async () => {
    planner.mockReturnValue({
      ...mockPlanner,
      ideas: async () => ({
        ideas: [{ kind: "menu", title: "Irani chai", description: "With Osmania biscuits." }],
        sources: [{ uri: "https://example.com", title: "Example" }],
      }),
    });
    const body = await (await POST(postJson({ brief: weddingBrief }))).json();
    expect(body.ideas).toHaveLength(1);
    expect(body.sources[0].uri).toBe("https://example.com");
  });

  it("serves repeated requests for the same brief from cache", async () => {
    const ideas = vi.fn(mockPlanner.ideas);
    planner.mockReturnValue({ ...mockPlanner, ideas });
    const brief = { ...weddingBrief, name: "Ideas cache check" };
    await POST(postJson({ brief }));
    await POST(postJson({ brief }));
    expect(ideas).toHaveBeenCalledTimes(1);
  });

  it("returns 503 when AI is not configured", async () => {
    planner.mockReturnValue(null);
    expect((await POST(postJson({ brief: weddingBrief }))).status).toBe(503);
  });

  it("returns 502 with a friendly message when Gemini fails", async () => {
    planner.mockReturnValue({
      ...mockPlanner,
      ideas: () => Promise.reject(new AiError("Gemini is busy. Try again in a minute.")),
    });
    const brief = { ...weddingBrief, name: "Ideas failure check" };
    const res = await POST(postJson({ brief }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Gemini is busy. Try again in a minute." });
  });

  it("limits each client to 8 requests a minute", async () => {
    const statuses = [];
    for (let i = 0; i < 9; i++) {
      const brief = { ...weddingBrief, name: `Rate check ${i}` };
      statuses.push((await POST(postJson({ brief }, "203.0.113.50"))).status);
    }
    expect(statuses.slice(0, 8).every((s) => s === 200)).toBe(true);
    expect(statuses[8]).toBe(429);
  });
});
