import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { offlinePlanner } from "@/lib/ai/offline";
import { getPlanner } from "@/lib/ai/planner";
import { AiError } from "@/lib/ai/types";
import { postJson } from "@/test/fixtures";
import { aiRoute } from "./route";

vi.mock("@/lib/ai/planner", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/planner")>()),
  getPlanner: vi.fn(),
}));
const planner = vi.mocked(getPlanner);

beforeEach(() => {
  planner.mockReturnValue(offlinePlanner);
});

const echo = (options: { limit?: number } = {}) =>
  aiRoute(
    { schema: z.object({ name: z.string() }), limit: options.limit ?? 5, unconfigured: "Off." },
    ({ name }) => Promise.resolve(Response.json({ hello: name })),
  );

describe("aiRoute", () => {
  it("hands the validated body and the planner to the handler", async () => {
    const res = await echo()(postJson({ name: "Asha" }));
    expect(await res.json()).toEqual({ hello: "Asha" });
  });

  it("rejects an invalid body before calling the handler", async () => {
    expect((await echo()(postJson({ name: 3 }))).status).toBe(400);
  });

  it("rate-limits each client separately", async () => {
    const route = echo({ limit: 1 });
    expect((await route(postJson({ name: "a" }, "203.0.113.1"))).status).toBe(200);
    const limited = await route(postJson({ name: "a" }, "203.0.113.1"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
    expect((await route(postJson({ name: "a" }, "203.0.113.2"))).status).toBe(200);
  });

  it("returns 503 with the route's own message when AI is not configured", async () => {
    planner.mockReturnValue(null);
    const res = await echo()(postJson({ name: "Asha" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Off." });
  });

  it("turns AI failures into a 502 and lets other errors through", async () => {
    const failing = (error: Error) =>
      aiRoute({ schema: z.object({}), limit: 5, unconfigured: "Off." }, () =>
        Promise.reject(error),
      );
    const res = await failing(new AiError("Try again."))(postJson({}));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "Try again." });
    await expect(failing(new TypeError("bug"))(postJson({}))).rejects.toThrow("bug");
  });
});
