import { allocateBudget, moveBudget } from "./budget";
import {
  PlanSchema,
  RunSheetItemSchema,
  type Brief,
  type Plan,
  type PlanChange,
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
      name: "",
      status: "todo" as const,
      quote: null,
      questions: v.questions,
    })),
    ideas: uniqueIds(draft.ideas, (i) => `${i.kind} ${i.title}`),
    updatedAt: ctx.now.toISOString(),
  });
}

function edit(plan: Plan, change: PlanChange): Omit<Plan, "updatedAt"> {
  switch (change.op) {
    case "moveBudget":
      return { ...plan, budget: moveBudget(plan.budget, change) };

    case "logSpend": {
      if (!plan.budget.some((l) => l.id === change.id)) {
        throw new Error(`Unknown budget category: ${change.id}`);
      }
      const budget = plan.budget.map((l) =>
        l.id === change.id ? { ...l, spent: l.spent + change.amount } : l,
      );
      return { ...plan, budget };
    }

    case "addMilestone": {
      if (change.due > plan.brief.date) throw new Error("That date is after the event");
      const base = slugify(change.title) || "task";
      let id = base;
      for (let n = 2; plan.milestones.some((m) => m.id === id); n++) id = `${base}-${n}`;
      const milestones = [
        ...plan.milestones,
        { id, title: change.title, due: change.due, done: false },
      ];
      return { ...plan, milestones: milestones.sort((a, b) => a.due.localeCompare(b.due)) };
    }

    case "toggleMilestone": {
      if (!plan.milestones.some((m) => m.id === change.id)) {
        throw new Error(`Milestone not found: ${change.id}`);
      }
      const milestones = plan.milestones.map((m) =>
        m.id === change.id ? { ...m, done: !m.done } : m,
      );
      return { ...plan, milestones };
    }

    case "addVendor": {
      const id = slugify(change.category);
      if (plan.vendors.some((v) => v.id === id)) {
        throw new Error(`${change.category} is already on the checklist`);
      }
      const vendor = {
        id,
        category: change.category,
        name: "",
        status: "todo" as const,
        quote: null,
        questions: change.questions,
      };
      return { ...plan, vendors: [...plan.vendors, vendor] };
    }

    case "setVendorStatus": {
      if (!plan.vendors.some((v) => v.id === change.id)) {
        throw new Error(`Vendor not found: ${change.id}`);
      }
      const vendors = plan.vendors.map((v) =>
        v.id === change.id
          ? {
              ...v,
              status: change.status,
              quote: change.quote === undefined ? v.quote : change.quote,
            }
          : v,
      );
      return { ...plan, vendors };
    }

    case "addIdea": {
      const idea = { kind: change.kind, title: change.title, description: change.description };
      const [withId] = uniqueIds([idea], (i) => `${i.kind} ${i.title} ${plan.ideas.length + 1}`);
      return { ...plan, ideas: [...plan.ideas, withId!] };
    }
  }
}

/** Applies one change and re-validates the whole plan, so no edit can leave it inconsistent. */
export function applyChange(plan: Plan, change: PlanChange, now: Date = new Date()): Plan {
  return PlanSchema.parse({ ...edit(plan, change), updatedAt: now.toISOString() });
}
