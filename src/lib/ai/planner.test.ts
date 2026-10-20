import { describe, expect, it, vi } from "vitest";
import { buildPlan, fallbackDraft } from "@/lib/domain/plan";
import type { Brief } from "@/lib/domain/schema";
import {
  AiError,
  createGeminiPlanner,
  getPlanner,
  mockPlanner,
  modelChain,
  type Generate,
} from "./planner";

const brief: Brief = {
  type: "wedding",
  name: "Ananya & Rohan",
  date: "2027-02-14",
  city: "Hyderabad",
  guests: 300,
  budget: 2_500_000,
  currency: "INR",
  vibe: "",
  traditions: [],
  diet: "",
  language: "en",
};
const plan = buildPlan(brief, fallbackDraft(brief), {
  id: "p1",
  today: "2026-10-20",
  now: new Date("2026-10-20T00:00:00Z"),
});

const fake = (response: object) => vi.fn<Generate>().mockResolvedValue(response);

describe("createGeminiPlanner", () => {
  it("requests schema-constrained JSON for the plan draft and validates it", async () => {
    const draft = fallbackDraft(brief);
    const generate = fake({ text: JSON.stringify(draft) });
    const result = await createGeminiPlanner(generate, ["gemini-test"]).draftPlan(
      brief,
      "2026-10-20",
    );

    expect(result).toEqual(draft);
    const call = generate.mock.calls[0]![0];
    expect(call.model).toBe("gemini-test");
    expect(call.config?.responseMimeType).toBe("application/json");
    expect(call.config?.responseJsonSchema).toMatchObject({ type: "object" });
    expect(String(call.config?.systemInstruction)).toContain("UtsavOS");
    expect(call.config?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("raises AiError when the model returns something that is not a valid draft", async () => {
    const planner = createGeminiPlanner(fake({ text: '{"budget": "lots"}' }), ["m"]);
    await expect(planner.draftPlan(brief, "2026-10-20")).rejects.toBeInstanceOf(AiError);
    const broken = createGeminiPlanner(fake({ text: "not json" }), ["m"]);
    await expect(broken.draftPlan(brief, "2026-10-20")).rejects.toBeInstanceOf(AiError);
  });

  it("raises AiError when the API call itself fails", async () => {
    const generate = vi.fn<Generate>().mockRejectedValue(new Error("quota"));
    await expect(
      createGeminiPlanner(generate, ["m"]).draftPlan(brief, "2026-10-20"),
    ).rejects.toBeInstanceOf(AiError);
  });

  it("keeps only the brief fields that are valid when parsing a description", async () => {
    const generate = fake({
      text: JSON.stringify({
        type: "birthday",
        city: "Pune",
        guests: 60,
        date: "next week",
        budget: -1,
      }),
    });
    const patch = await createGeminiPlanner(generate, ["m"]).parseBrief(
      "Meera ka birthday",
      "2026-10-20",
    );
    expect(patch).toEqual({ type: "birthday", city: "Pune", guests: 60 });
  });

  it("sends chat history with roles and returns the reply plus validated plan changes", async () => {
    const generate = fake({
      text: "Moved ₹25,000 into decor.",
      functionCalls: [
        { name: "moveBudget", args: { from: "entertainment", to: "decor", amount: 25000 } },
        { name: "dropTable", args: {} },
      ],
    });
    const result = await createGeminiPlanner(generate, ["m"]).chat(plan, [
      { role: "user", text: "Hi" },
      { role: "model", text: "Hello!" },
      { role: "user", text: "Decor is over budget" },
    ]);

    expect(result).toEqual({
      reply: "Moved ₹25,000 into decor.",
      changes: [{ op: "moveBudget", from: "entertainment", to: "decor", amount: 25000 }],
    });
    const call = generate.mock.calls[0]![0];
    expect(call.contents).toEqual([
      { role: "user", parts: [{ text: "Hi" }] },
      { role: "model", parts: [{ text: "Hello!" }] },
      { role: "user", parts: [{ text: "Decor is over budget" }] },
    ]);
    expect(String(call.config?.systemInstruction)).toContain("<plan>");
    expect(call.config?.tools?.[0]).toHaveProperty("functionDeclarations");
  });

  it("writes a short reply when the model only proposes changes", async () => {
    const generate = fake({ functionCalls: [{ name: "toggleMilestone", args: { id: "x" } }] });
    const result = await createGeminiPlanner(generate, ["m"]).chat(plan, [
      { role: "user", text: "done" },
    ]);
    expect(result.reply.length).toBeGreaterThan(0);
    expect(result.changes).toHaveLength(1);
  });

  it("grounds ideas with Google Search and returns the cited web sources", async () => {
    const generate = fake({
      text: '```json\n[{"kind":"menu","title":"Irani chai counter","description":"Osmania biscuits too."}]\n```',
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              { web: { uri: "https://example.com/chai", title: "Chai guide" } },
              { web: { uri: "https://example.com/chai", title: "Chai guide" } },
              { web: { uri: "javascript:alert(1)", title: "bad" } },
            ],
          },
        },
      ],
    });
    const result = await createGeminiPlanner(generate, ["m"]).ideas(brief);

    expect(generate.mock.calls[0]![0].config?.tools).toEqual([{ googleSearch: {} }]);
    expect(result.ideas).toEqual([
      { kind: "menu", title: "Irani chai counter", description: "Osmania biscuits too." },
    ]);
    expect(result.sources).toEqual([{ uri: "https://example.com/chai", title: "Chai guide" }]);
  });
});

describe("mockPlanner", () => {
  it("returns the template draft so the app works offline and in end-to-end tests", async () => {
    expect(await mockPlanner.draftPlan(brief, "2026-10-20")).toEqual(fallbackDraft(brief));
  });

  it("proposes a valid budget move when asked about the budget", async () => {
    const { changes } = await mockPlanner.chat(plan, [{ role: "user", text: "fix my budget" }]);
    expect(changes[0]).toMatchObject({ op: "moveBudget" });
  });
});

describe("getPlanner", () => {
  it("uses the mock when UTSAV_AI_MOCK=1, Gemini when a key is set, and nothing otherwise", () => {
    expect(getPlanner({ UTSAV_AI_MOCK: "1" })?.source).toBe("mock");
    expect(getPlanner({ GEMINI_API_KEY: "k" })?.source).toBe("gemini");
    expect(getPlanner({})).toBeNull();
  });
});

describe("model fallback", () => {
  const apiError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

  it("moves to the next model when one is overloaded, rate limited or unavailable", async () => {
    const draft = fallbackDraft(brief);
    const generate = vi
      .fn<Generate>()
      .mockRejectedValueOnce(apiError(503))
      .mockRejectedValueOnce(apiError(429))
      .mockResolvedValueOnce({ text: JSON.stringify(draft) });
    const planner = createGeminiPlanner(generate, ["a", "b", "c"]);

    expect(await planner.draftPlan(brief, "2026-10-20")).toEqual(draft);
    expect(generate.mock.calls.map(([p]) => p.model)).toEqual(["a", "b", "c"]);
  });

  it("fails fast on errors another model would not fix", async () => {
    const generate = vi.fn<Generate>().mockRejectedValue(apiError(400));
    await expect(
      createGeminiPlanner(generate, ["a", "b"]).draftPlan(brief, "2026-10-20"),
    ).rejects.toBeInstanceOf(AiError);
    expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe("modelChain", () => {
  it("reads a comma-separated GEMINI_MODEL, or uses the defaults", () => {
    expect(modelChain({ GEMINI_MODEL: "x, y" })).toEqual(["x", "y"]);
    expect(modelChain({}).length).toBeGreaterThanOrEqual(2);
  });
});
