import type { Plan, PlanChange } from "./schema";

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

/** A co-planner change as a sentence the person can approve or dismiss. */
export function describeChange(change: PlanChange, plan: Plan): string {
  const money = (n: number) => formatMoney(n, plan.brief.currency);
  const category = (id: string) => plan.budget.find((l) => l.id === id)?.category ?? id;

  switch (change.op) {
    case "moveBudget":
      return `Move ${money(change.amount)} from ${category(change.from)} to ${category(change.to)}`;
    case "logSpend":
      return `Log ${money(change.amount)} spent on ${category(change.id)}`;
    case "addMilestone":
      return `Add task “${change.title}”, due ${formatDate(change.due)}`;
    case "toggleMilestone": {
      const m = plan.milestones.find((x) => x.id === change.id);
      return `Mark “${m?.title ?? change.id}” as ${m?.done ? "not done" : "done"}`;
    }
    case "addVendor":
      return `Add ${change.category} to the vendor checklist`;
    case "setVendorStatus": {
      const name = plan.vendors.find((v) => v.id === change.id)?.category ?? change.id;
      const quote = change.quote ? `, quote ${money(change.quote)}` : "";
      return `Mark ${name} as ${change.status === "todo" ? "to do" : change.status}${quote}`;
    }
    case "addIdea":
      return `Add ${change.kind} idea “${change.title}”`;
  }
}
