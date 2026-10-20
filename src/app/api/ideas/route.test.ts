import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPlanner, mockPlanner } from "@/lib/ai/planner";
import { postJson, weddingBrief } from "@/test/fixtures";
import { POST } from "./route";

vi.mock("@/lib/ai/planner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/planner")>()),
  getPlanner: vi.fn(),
}));
const planner = vi.mocked(getPlanner);

beforeEach(() => planner.mockReturnValue(mockPlanner));

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

  it("returns 503 when AI is not configured", async () => {
    planner.mockReturnValue(null);
    expect((await POST(postJson({ brief: weddingBrief }))).status).toBe(503);
  });
});
