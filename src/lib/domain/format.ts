import type { Plan, PlanChange, PlanChangeMap, PlanChangeOp } from "./schema";

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

const categoryName = (plan: Plan, id: string) =>
  plan.budget.find((l) => l.id === id)?.category ?? id;

type Describers = { [K in PlanChangeOp]: (change: PlanChangeMap[K], plan: Plan) => string };

const DESCRIBERS: Describers = {
  moveBudget: ({ amount, from, to }, plan) =>
    `Move ${formatMoney(amount, plan.brief.currency)} from ${categoryName(plan, from)} to ${categoryName(plan, to)}`,
  logSpend: ({ amount, id }, plan) =>
    `Log ${formatMoney(amount, plan.brief.currency)} spent on ${categoryName(plan, id)}`,
  addMilestone: ({ title, due }) => `Add task “${title}”, due ${formatDate(due)}`,
  toggleMilestone: ({ id }, plan) => {
    const milestone = plan.milestones.find((m) => m.id === id);
    return `Mark “${milestone?.title ?? id}” as ${milestone?.done ? "not done" : "done"}`;
  },
  addVendor: ({ category }) => `Add ${category} to the vendor checklist`,
  setVendorStatus: ({ id, status, quote }, plan) => {
    const name = plan.vendors.find((v) => v.id === id)?.category ?? id;
    const quoted = quote ? `, quote ${formatMoney(quote, plan.brief.currency)}` : "";
    return `Mark ${name} as ${status === "todo" ? "to do" : status}${quoted}`;
  },
  addIdea: ({ kind, title }) => `Add ${kind} idea “${title}”`,
};

function describe<K extends PlanChangeOp>(op: K, change: PlanChangeMap[K], plan: Plan): string {
  return DESCRIBERS[op](change, plan);
}

/** A co-planner change as a sentence the person can approve or dismiss. */
export function describeChange(change: PlanChange, plan: Plan): string {
  return describe(change.op, change, plan);
}
