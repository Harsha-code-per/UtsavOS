import { describe, expect, it, vi } from "vitest";
import { buildPlan } from "@/lib/domain/plan";
import type { Brief } from "@/lib/domain/schema";
import { fallbackDraft } from "@/lib/domain/templates";
import { nth } from "@/test/fixtures";
import { createGeminiPlanner, type Generate } from "./gemini";
import { offlinePlanner } from "./offline";
import { getPlanner, modelChain } from "./planner";
import { AiError } from "./types";

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
    const call = nth(generate.mock.calls, 0)[0];
    expect(call.model).toBe("gemini-test");
    expect(call.config?.responseMimeType).toBe("application/json");
    expect(call.config?.responseJsonSchema).toMatchObject({ type: "object" });
    expect(String(call.config?.systemInstruction)).toContain("UtsavOS");
    expect(call.config?.abortSignal).toBeInstanceOf(AbortSignal);
    expect(call.config?.thinkingConfig).toEqual({ thinkingLevel: "LOW" });
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
    const call = nth(generate.mock.calls, 0)[0];
    expect(call.contents).toEqual([
      { role: "user", parts: [{ text: "Hi" }] },
      { role: "model", parts: [{ text: "Hello!" }] },
      { role: "user", parts: [{ text: "Decor is over budget" }] },
    ]);
    expect(String(call.config?.systemInstruction)).toContain("<plan>");
    expect(call.config?.tools?.[0]).toHaveProperty("functionDeclarations");
  });

  it("strips Markdown emphasis from replies, since the chat shows plain text", async () => {
    const generate = fake({ text: "1. **Animal sounds:** guess the animal\n2. __Jungle hunt__" });
    const { reply } = await createGeminiPlanner(generate, ["m"]).chat(plan, [
      { role: "user", text: "games?" },
    ]);
    expect(reply).toBe("1. Animal sounds: guess the animal\n2. Jungle hunt");
  });

  it("writes the fallback reply in the person's language when the model sends only changes", async () => {
    const generate = fake({ functionCalls: [{ name: "toggleMilestone", args: { id: "x" } }] });
    const hindiPlan = { ...plan, brief: { ...plan.brief, language: "hi" as const } };
    const hindi = await createGeminiPlanner(generate, ["m"]).chat(hindiPlan, [
      { role: "user", text: "बच्चों के लिए खेल सुझाओ" },
    ]);
    expect(hindi.reply).toMatch(/[\u0900-\u097F]/);
    const english = await createGeminiPlanner(generate, ["m"]).chat(hindiPlan, [
      { role: "user", text: "suggest games" },
    ]);
    expect(english.reply).toMatch(/^Here/);
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

    expect(nth(generate.mock.calls, 0)[0].config?.tools).toEqual([{ googleSearch: {} }]);
    expect(result.ideas).toEqual([
      { kind: "menu", title: "Irani chai counter", description: "Osmania biscuits too." },
    ]);
    expect(result.sources).toEqual([{ uri: "https://example.com/chai", title: "Chai guide" }]);
  });
});

describe("ideas without Search grounding", () => {
  it("falls back to structured, ungrounded ideas when grounding is unavailable", async () => {
    const idea = { kind: "gift", title: "Diya kits", description: "Paint-your-own clay diyas." };
    const generate = vi
      .fn<Generate>()
      .mockRejectedValueOnce(Object.assign(new Error("quota"), { status: 429 }))
      .mockResolvedValueOnce({ text: JSON.stringify([idea]) });
    const result = await createGeminiPlanner(generate, ["m"]).ideas(brief);

    expect(result).toEqual({ ideas: [idea], sources: [] });
    const fallback = nth(generate.mock.calls, 1)[0];
    expect(fallback.config?.tools).toBeUndefined();
    expect(fallback.config?.responseJsonSchema).toMatchObject({ type: "array" });
  });
});

describe("offlinePlanner", () => {
  it("returns the template draft so the app works offline and in end-to-end tests", async () => {
    expect(await offlinePlanner.draftPlan(brief, "2026-10-20")).toEqual(fallbackDraft(brief));
  });

  it("proposes moving spare money into an overspent category", async () => {
    const overspent = {
      ...plan,
      budget: plan.budget.map((l) => (l.id === "decor" ? { ...l, spent: l.allocated + 8000 } : l)),
    };
    const { changes } = await offlinePlanner.chat(overspent, [
      { role: "user", text: "fix my budget" },
    ]);
    expect(changes[0]).toMatchObject({ op: "moveBudget", to: "decor", amount: 8000 });
  });
});

describe("getPlanner", () => {
  it("uses the offline planner when UTSAV_AI_OFFLINE=1, Gemini when a key is set, and nothing otherwise", () => {
    expect(getPlanner({ UTSAV_AI_OFFLINE: "1" })?.source).toBe("offline");
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
    const defaults = modelChain({});
    expect(defaults.length).toBeGreaterThanOrEqual(2);
    // "gemini-flash-latest" aliases the newest Flash, duplicating the first entry.
    expect(defaults).not.toContain("gemini-flash-latest");
  });
});
