import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiError, getPlanner, mockPlanner } from "@/lib/ai/planner";
import { postJson } from "@/test/fixtures";
import { POST } from "./route";

vi.mock("@/lib/ai/planner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/planner")>()),
  getPlanner: vi.fn(),
}));
const planner = vi.mocked(getPlanner);

beforeEach(() => planner.mockReturnValue(mockPlanner));

describe("POST /api/brief", () => {
  it("returns the brief fields extracted from a description", async () => {
    const res = await POST(postJson({ description: "Beti ka pehla birthday, Pune, 60 log" }));
    expect(res.status).toBe(200);
    expect((await res.json()).patch).toMatchObject({ city: "Pune", guests: 60 });
  });

  it("rejects an empty description", async () => {
    expect((await POST(postJson({ description: "   " }))).status).toBe(400);
  });

  it("returns 503 when AI is not configured", async () => {
    planner.mockReturnValue(null);
    expect((await POST(postJson({ description: "a birthday" }))).status).toBe(503);
  });

  it("returns 502 with a friendly message when Gemini fails", async () => {
    planner.mockReturnValue({
      ...mockPlanner,
      parseBrief: () => Promise.reject(new AiError("Try again.")),
    });
    const res = await POST(postJson({ description: "a birthday" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Try again." });
  });
});
