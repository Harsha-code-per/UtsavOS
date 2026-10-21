import { beforeEach, describe, expect, it, vi } from "vitest";
import { offlinePlanner } from "@/lib/ai/offline";
import { getPlanner } from "@/lib/ai/planner";
import { AiError } from "@/lib/ai/types";
import { fallbackDraft } from "@/lib/domain/templates";
import { weddingBrief } from "@/test/fixtures";
import { draftOrStarter } from "./draft";

vi.mock("@/lib/ai/planner", () => ({ getPlanner: vi.fn() }));
const planner = vi.mocked(getPlanner);
const today = "2026-10-20";
let n = 0;
const freshBrief = () => ({ ...weddingBrief, name: `Draft check ${++n}` });

beforeEach(() => {
  planner.mockReset();
});

describe("draftOrStarter", () => {
  it("returns the planner's draft and serves the same brief from cache", async () => {
    const draftPlan = vi.fn(offlinePlanner.draftPlan);
    planner.mockReturnValue({ ...offlinePlanner, draftPlan });
    const brief = freshBrief();
    const first = await draftOrStarter(brief, today);
    const second = await draftOrStarter(brief, today);
    expect(first).toEqual({ draft: fallbackDraft(brief), source: "offline" });
    expect(second).toBe(first);
    expect(draftPlan).toHaveBeenCalledTimes(1);
  });

  it("falls back to a starter plan, saying why, when AI isn't configured", async () => {
    planner.mockReturnValue(null);
    const result = await draftOrStarter(freshBrief(), today);
    expect(result.source).toBe("template");
    expect(result.notice).toMatch(/isn't configured/);
  });

  it("falls back to a starter plan when Gemini fails, and doesn't cache the failure", async () => {
    const draftPlan = vi.fn(() => Promise.reject(new AiError("Gemini is busy.")));
    planner.mockReturnValue({ ...offlinePlanner, draftPlan });
    const brief = freshBrief();
    expect((await draftOrStarter(brief, today)).notice).toMatch(
      /^Gemini is busy\. Here's a starter/,
    );
    await draftOrStarter(brief, today);
    expect(draftPlan).toHaveBeenCalledTimes(2);
  });

  it("lets unexpected errors through", async () => {
    planner.mockReturnValue({
      ...offlinePlanner,
      draftPlan: () => Promise.reject(new TypeError("bug")),
    });
    await expect(draftOrStarter(freshBrief(), today)).rejects.toThrow("bug");
  });
});
