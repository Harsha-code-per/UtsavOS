import type { z } from "zod";
import { allocateBudget, moveBudget } from "./budget";
import {
  DRAFT_ITEMS,
  DRAFT_LIMITS,
  LooseObject,
  PlanSchema,
  RunSheetItemSchema,
  type Brief,
  type Plan,
  type PlanChange,
  type PlanChangeMap,
  type PlanChangeOp,
  type PlanDraft,
} from "./schema";
import { slugify } from "./slug";
import { fallbackDraft } from "./templates";
import { scheduleMilestones } from "./timeline";

export { fallbackDraft };

interface BuildContext {
  id: string;
  today: string;
  now: Date;
}

function uniqueIds<T>(items: T[], key: (item: T) => string): (T & { id: string })[] {
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const id = slugify(key(item));
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [{ ...item, id }];
  });
}

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Model output is untrusted: keep each item that validates, drop the rest, trim lists to their
 * limits. Returns null when nothing usable is left (no budget split).
 */
export function sanitizeDraft(raw: unknown): PlanDraft | null {
  const parsed = LooseObject.safeParse(raw);
  if (!parsed.success) return null;
  const source = parsed.data;

  const pick = <K extends keyof typeof DRAFT_ITEMS>(key: K, prepare = (item: unknown) => item) =>
    asList(source[key])
      .flatMap((item) => {
        const parsed = DRAFT_ITEMS[key].safeParse(prepare(item));
        return parsed.success ? [parsed.data as z.infer<(typeof DRAFT_ITEMS)[K]>] : [];
      })
      .slice(0, DRAFT_LIMITS[key]);

  const draft = {
    budget: pick("budget"),
    milestones: pick("milestones"),
    runSheet: pick("runSheet"),
    vendors: pick("vendors", (item) => {
      const vendor = LooseObject.safeParse(item);
      if (!vendor.success) return item;
      const questions = asList(vendor.data.questions)
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0 && q.length <= 200)
        .slice(0, 6);
      return { ...vendor.data, questions };
    }),
    ideas: pick("ideas"),
  };
  return draft.budget.length ? draft : null;
}

/** Turns a model draft (percentages, "days before") into a concrete, validated plan. */
export function buildPlan(brief: Brief, draft: PlanDraft, ctx: BuildContext): Plan {
  const runSheet = draft.runSheet
    .filter((item) => RunSheetItemSchema.safeParse(item).success)
    .sort((a, b) => a.time.localeCompare(b.time));

  return PlanSchema.parse({
    id: ctx.id,
    brief,
    budget: allocateBudget(brief.budget, draft.budget),
    milestones: scheduleMilestones(brief.date, ctx.today, draft.milestones),
    runSheet,
    vendors: uniqueIds(draft.vendors, (v) => v.category).map((v) => ({
      id: v.id,
      category: v.category,
      status: "todo" as const,
      quote: null,
      questions: v.questions,
    })),
    ideas: uniqueIds(draft.ideas, (i) => `${i.kind} ${i.title}`),
    updatedAt: ctx.now.toISOString(),
  });
}

type PlanFields = Omit<Plan, "updatedAt">;
type Editors = { [K in PlanChangeOp]: (plan: Plan, change: PlanChangeMap[K]) => PlanFields };

/** Replaces the item with `target.id`, or throws `target.missing` if there is none. */
function updateById<T extends { id: string }>(
  items: T[],
  target: { id: string; missing: string },
  update: (item: T) => T,
): T[] {
  if (!items.some((item) => item.id === target.id)) throw new Error(target.missing);
  return items.map((item) => (item.id === target.id ? update(item) : item));
}

/** `base`, or `base-2`, `base-3`… whichever is not taken yet. */
function freeId(base: string, taken: { id: string }[]): string {
  let id = base;
  for (let n = 2; taken.some((item) => item.id === id); n++) id = `${base}-${n}`;
  return id;
}

const byDue = (a: { due: string }, b: { due: string }) => a.due.localeCompare(b.due);

const EDITORS: Editors = {
  moveBudget: (plan, change) => ({ ...plan, budget: moveBudget(plan.budget, change) }),

  logSpend: (plan, { id, amount }) => ({
    ...plan,
    budget: updateById(plan.budget, { id, missing: `Unknown budget category: ${id}` }, (line) => ({
      ...line,
      spent: line.spent + amount,
    })),
  }),

  addMilestone: (plan, { title, due }) => {
    if (due > plan.brief.date) throw new Error("That date is after the event");
    const id = freeId(slugify(title) || "task", plan.milestones);
    return {
      ...plan,
      milestones: [...plan.milestones, { id, title, due, done: false }].sort(byDue),
    };
  },

  toggleMilestone: (plan, { id }) => ({
    ...plan,
    milestones: updateById(plan.milestones, { id, missing: `Milestone not found: ${id}` }, (m) => ({
      ...m,
      done: !m.done,
    })),
  }),

  addVendor: (plan, { category, questions }) => {
    const id = slugify(category);
    if (plan.vendors.some((v) => v.id === id)) {
      throw new Error(`${category} is already on the checklist`);
    }
    const vendor = { id, category, status: "todo" as const, quote: null, questions };
    return { ...plan, vendors: [...plan.vendors, vendor] };
  },

  setVendorStatus: (plan, { id, status, quote }) => ({
    ...plan,
    vendors: updateById(plan.vendors, { id, missing: `Vendor not found: ${id}` }, (v) => ({
      ...v,
      status,
      quote: quote === undefined ? v.quote : quote,
    })),
  }),

  addIdea: (plan, { kind, title, description }) => {
    const id = freeId(slugify(`${kind} ${title}`) || "idea", plan.ideas);
    return { ...plan, ideas: [...plan.ideas, { id, kind, title, description }] };
  },
};

// The op is passed separately so TypeScript can correlate it with the change's type.
function edit<K extends PlanChangeOp>(op: K, plan: Plan, change: PlanChangeMap[K]): PlanFields {
  return EDITORS[op](plan, change);
}

/** Applies one change and re-validates the whole plan, so no edit can leave it inconsistent. */
export function applyChange(plan: Plan, change: PlanChange, now: Date = new Date()): Plan {
  return PlanSchema.parse({ ...edit(change.op, plan, change), updatedAt: now.toISOString() });
}

/** The changes that apply, in order, to this plan. Ones that miss an item or break a rule drop out. */
export function applicableChanges(plan: Plan, changes: PlanChange[]): PlanChange[] {
  const kept: PlanChange[] = [];
  changes.reduce((working, change) => {
    try {
      const next = applyChange(working, change);
      kept.push(change);
      return next;
    } catch {
      return working;
    }
  }, plan);
  return kept;
}
