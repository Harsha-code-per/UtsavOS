import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiError, getPlanner, mockPlanner, type Planner } from "@/lib/ai/planner";
import { PlanSchema } from "@/lib/domain/schema";
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

describe("POST /api/plan", () => {
  it("returns a valid plan drafted by the planner", async () => {
    const res = await POST(
      postJson({ brief: weddingBrief, today: new Date().toISOString().slice(0, 10) }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.source).toBe("mock");
    expect(PlanSchema.parse(body.plan).budget.reduce((a, l) => a + l.allocated, 0)).toBe(2_500_000);
  });

  it("falls back to a starter plan, with a notice, when Gemini fails", async () => {
    planner.mockReturnValue({
      ...mockPlanner,
      source: "gemini",
      draftPlan: () => Promise.reject(new AiError("Gemini is unavailable right now.")),
    } satisfies Planner);
    const body = await (
      await POST(postJson({ brief: { ...weddingBrief, name: "Gemini down" } }))
    ).json();
    expect(body.source).toBe("template");
    expect(body.notice).toMatch(/unavailable/);
    expect(body.plan.budget.length).toBeGreaterThan(0);
  });

  it("uses the starter plan when no AI is configured", async () => {
    planner.mockReturnValue(null);
    const body = await (
      await POST(postJson({ brief: { ...weddingBrief, name: "No AI configured" } }))
    ).json();
    expect(body.source).toBe("template");
  });

  it("serves a repeated identical brief from cache without calling Gemini again", async () => {
    const draftPlan = vi.fn(mockPlanner.draftPlan);
    planner.mockReturnValue({ ...mockPlanner, draftPlan });
    const repeat = { ...weddingBrief, name: "Cache check" };
    await POST(postJson({ brief: repeat, today: "2026-10-20" }));
    const second = await (await POST(postJson({ brief: repeat, today: "2026-10-20" }))).json();
    expect(draftPlan).toHaveBeenCalledTimes(1);
    expect(second.source).toBe("mock");
  });

  it("rejects an invalid brief with 400", async () => {
    const res = await POST(postJson({ brief: { ...weddingBrief, guests: 0 } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/guests/);
  });

  it("rate limits a client that sends too many requests", async () => {
    const statuses = [];
    for (let i = 0; i < 12; i++)
      statuses.push((await POST(postJson({ brief: weddingBrief }, "203.0.113.9"))).status);
    expect(statuses).toContain(429);
  });
});
