import { beforeEach, describe, expect, it, vi } from "vitest";
import { offlinePlanner } from "@/lib/ai/offline";
import { getPlanner } from "@/lib/ai/planner";
import { postJson, weddingPlan } from "@/test/fixtures";
import { POST } from "./route";

vi.mock("@/lib/ai/planner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/planner")>()),
  getPlanner: vi.fn(),
}));
const planner = vi.mocked(getPlanner);

beforeEach(() => {
  planner.mockReturnValue(offlinePlanner);
});

const ask = (text: string) => postJson({ plan: weddingPlan, messages: [{ role: "user", text }] });

describe("POST /api/chat", () => {
  it("returns the co-planner's reply and proposed changes", async () => {
    const body = await (await POST(ask("Decor is over budget"))).json();
    expect(body.reply).toBeTruthy();
    expect(body.changes[0]).toMatchObject({ op: "moveBudget" });
  });

  it("drops proposed changes that could not be applied to this plan", async () => {
    planner.mockReturnValue({
      ...offlinePlanner,
      chat: async () => ({
        reply: "Done",
        changes: [
          { op: "toggleMilestone", id: "does-not-exist" },
          { op: "moveBudget", from: "venue", to: "catering", amount: 999_999_999 },
          { op: "addIdea", kind: "gift", title: "Seed cards", description: "Grow tulsi." },
        ],
      }),
    });
    const body = await (await POST(ask("anything"))).json();
    expect(body.changes).toEqual([
      { op: "addIdea", kind: "gift", title: "Seed cards", description: "Grow tulsi." },
    ]);
  });

  it("requires the conversation to end with the person's message", async () => {
    const res = await POST(
      postJson({ plan: weddingPlan, messages: [{ role: "model", text: "hi" }] }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a tampered plan", async () => {
    const res = await POST(
      postJson({ plan: { ...weddingPlan, budget: [] }, messages: [{ role: "user", text: "hi" }] }),
    );
    expect(res.status).toBe(400);
  });
});
