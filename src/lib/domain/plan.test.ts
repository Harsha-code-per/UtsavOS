import { describe, expect, it } from "vitest";
import { applicableChanges, applyChange, buildPlan, sanitizeDraft } from "./plan";
import { EVENT_TYPES, PlanSchema, type Brief } from "./schema";
import { fallbackDraft } from "./templates";

const brief: Brief = {
  type: "wedding",
  name: "Ananya & Rohan",
  date: "2027-02-14",
  city: "Hyderabad",
  guests: 300,
  budget: 2_500_000,
  currency: "INR",
  vibe: "Marigold and moonlight",
  traditions: ["Haldi", "Sangeet"],
  diet: "Veg + non-veg",
  language: "en",
};
const ctx = { id: "plan-1", today: "2026-10-20", now: new Date("2026-10-20T08:00:00Z") };

describe("buildPlan", () => {
  it("turns a model draft into a valid plan whose budget matches the brief exactly", () => {
    const plan = buildPlan(
      brief,
      {
        budget: [
          { category: "Venue", percent: 40 },
          { category: "Catering", percent: 40 },
        ],
        milestones: [{ title: "Book venue", daysBefore: 100 }],
        runSheet: [{ time: "18:30", title: "Pheras" }],
        vendors: [{ category: "Decor", questions: ["Is teardown included?"] }],
        ideas: [{ kind: "theme", title: "Marigold & Moonlight", description: "Torans and diyas." }],
      },
      ctx,
    );
    expect(PlanSchema.parse(plan)).toEqual(plan);
    expect(plan.budget.reduce((a, l) => a + l.allocated, 0)).toBe(2_500_000);
    expect(plan.milestones[0]).toMatchObject({ title: "Book venue", due: "2026-11-06" });
    expect(plan.vendors[0]).toMatchObject({ id: "decor", status: "todo", quote: null });
    expect(plan.ideas[0]!.id).toBe("theme-marigold-moonlight");
    expect(plan.updatedAt).toBe("2026-10-20T08:00:00.000Z");
  });

  it("drops run-sheet items with malformed times instead of failing the whole plan", () => {
    const plan = buildPlan(
      brief,
      { ...fallbackDraft(brief), runSheet: [{ time: "7pm", title: "Dinner" }] },
      ctx,
    );
    expect(plan.runSheet).toEqual([]);
  });
});

describe("fallbackDraft", () => {
  it.each(EVENT_TYPES)("produces a complete, valid plan for a %s with no AI available", (type) => {
    const plan = buildPlan(
      { ...brief, type, traditions: [] },
      fallbackDraft({ ...brief, type, traditions: [] }),
      ctx,
    );
    expect(plan.budget.length).toBeGreaterThanOrEqual(4);
    expect(plan.milestones.length).toBeGreaterThanOrEqual(4);
    expect(plan.vendors.length).toBeGreaterThanOrEqual(3);
    expect(plan.ideas.length).toBeGreaterThanOrEqual(1);
  });

  it("turns each chosen tradition into a milestone", () => {
    const titles = buildPlan(brief, fallbackDraft(brief), ctx).milestones.map((m) => m.title);
    expect(titles).toEqual(expect.arrayContaining(["Plan the Haldi", "Plan the Sangeet"]));
  });
});

describe("applyChange", () => {
  const plan = buildPlan(brief, fallbackDraft(brief), ctx);
  const [first, second] = plan.budget;

  it("moves budget without changing the total", () => {
    const next = applyChange(plan, {
      op: "moveBudget",
      from: first!.id,
      to: second!.id,
      amount: 1000,
    });
    expect(next.budget[0]!.allocated).toBe(first!.allocated - 1000);
    expect(next.budget[1]!.allocated).toBe(second!.allocated + 1000);
  });

  it("logs spending against a category", () => {
    const next = applyChange(plan, { op: "logSpend", id: first!.id, amount: 5000 });
    expect(next.budget[0]!.spent).toBe(5000);
  });

  it("adds a milestone in date order and refuses dates after the event", () => {
    const next = applyChange(plan, {
      op: "addMilestone",
      title: "Sangeet rehearsal",
      due: "2027-02-10",
    });
    const index = next.milestones.findIndex((m) => m.title === "Sangeet rehearsal");
    expect(next.milestones[index + 1]!.due >= "2027-02-10").toBe(true);
    expect(() =>
      applyChange(plan, { op: "addMilestone", title: "Late", due: "2027-03-01" }),
    ).toThrow(/after the event/i);
  });

  it("toggles a milestone", () => {
    const id = plan.milestones[0]!.id;
    expect(applyChange(plan, { op: "toggleMilestone", id }).milestones[0]!.done).toBe(true);
  });

  it("adds a vendor and updates its booking status and quote", () => {
    const added = applyChange(plan, { op: "addVendor", category: "Mehendi artist", questions: [] });
    const updated = applyChange(added, {
      op: "setVendorStatus",
      id: "mehendi-artist",
      status: "booked",
      quote: 18000,
    });
    expect(updated.vendors.find((v) => v.id === "mehendi-artist")).toMatchObject({
      status: "booked",
      quote: 18000,
    });
  });

  it("adds an idea", () => {
    const next = applyChange(plan, {
      op: "addIdea",
      kind: "gift",
      title: "Seed paper cards",
      description: "Grow tulsi.",
    });
    expect(next.ideas.at(-1)!.title).toBe("Seed paper cards");
  });

  it("refreshes updatedAt and never mutates the original plan", () => {
    const before = JSON.stringify(plan);
    const next = applyChange(
      plan,
      { op: "logSpend", id: first!.id, amount: 1 },
      new Date("2026-10-21T00:00:00Z"),
    );
    expect(next.updatedAt).toBe("2026-10-21T00:00:00.000Z");
    expect(JSON.stringify(plan)).toBe(before);
  });

  it("rejects changes that reference things that do not exist", () => {
    expect(() => applyChange(plan, { op: "toggleMilestone", id: "nope" })).toThrow(/not found/i);
    expect(() => applyChange(plan, { op: "logSpend", id: "nope", amount: 5 })).toThrow(/unknown/i);
  });
});

describe("applicableChanges", () => {
  const plan = buildPlan(brief, fallbackDraft(brief), ctx);
  const [first, second] = plan.budget;

  it("keeps changes that apply in order and drops ones that don't", () => {
    const changes = [
      { op: "logSpend", id: first!.id, amount: 5000 },
      { op: "toggleMilestone", id: "no-such-task" },
      { op: "addMilestone", title: "Late", due: "2027-03-01" },
      { op: "moveBudget", from: first!.id, to: second!.id, amount: 1000 },
    ] as const;
    expect(applicableChanges(plan, [...changes])).toEqual([changes[0], changes[3]]);
  });

  it("checks each change against the plan as the earlier ones left it", () => {
    const all = first!.allocated;
    const move = { op: "moveBudget", from: first!.id, to: second!.id, amount: all } as const;
    expect(applicableChanges(plan, [move, move])).toEqual([move]);
  });
});

describe("sanitizeDraft", () => {
  const good = fallbackDraft(brief);

  it("keeps a valid draft as it is", () => {
    expect(sanitizeDraft(good)).toEqual(good);
  });

  it("drops invalid items instead of rejecting the whole draft", () => {
    const draft = sanitizeDraft({
      ...good,
      ideas: [
        { kind: "theme", title: "Ok", description: "Fine." },
        { kind: "spaceship", title: "x" },
      ],
      vendors: [{ category: "Decor", questions: ["Q?", 42] }],
    });
    expect(draft?.ideas).toEqual([{ kind: "theme", title: "Ok", description: "Fine." }]);
    expect(draft?.vendors).toEqual([{ category: "Decor", questions: ["Q?"] }]);
  });

  it("trims over-long lists to their limits", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ title: `Task ${i}`, daysBefore: i }));
    expect(sanitizeDraft({ ...good, milestones: many })?.milestones).toHaveLength(40);
  });

  it("returns null when there is no usable budget or the input is not an object", () => {
    expect(sanitizeDraft({ ...good, budget: [] })).toBeNull();
    expect(sanitizeDraft("nope")).toBeNull();
  });
});
