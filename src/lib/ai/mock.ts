import { fallbackDraft } from "@/lib/domain/plan";
import type { BudgetLine, Plan, PlanChange } from "@/lib/domain/schema";
import type { Planner } from "./types";

const room = (line: BudgetLine) => line.allocated - line.spent;
const categoryName = (plan: Plan, id: string) =>
  plan.budget.find((line) => line.id === id)?.category ?? id;

/** Moves spare money into the first overspent line (or a quarter of the roomiest into the first). */
function proposeRebalance(plan: Plan): PlanChange | null {
  const over = plan.budget.find((line) => line.spent > line.allocated);
  const to = over ?? plan.budget[0];
  if (!to) return null;
  const from = plan.budget.filter((line) => line.id !== to.id).sort((a, b) => room(b) - room(a))[0];
  if (!from) return null;
  const wanted = over ? over.spent - over.allocated : Math.floor(from.allocated / 4);
  const amount = Math.min(wanted, room(from));
  return amount > 0 ? { op: "moveBudget", from: from.id, to: to.id, amount } : null;
}

/** Deterministic stand-in for Gemini, used in end-to-end tests (UTSAV_AI_MOCK=1). */
export const mockPlanner: Planner = {
  source: "mock",
  draftPlan: (brief) => Promise.resolve(fallbackDraft(brief)),
  parseBrief: () =>
    Promise.resolve({
      type: "birthday",
      name: "Meera's first birthday",
      city: "Pune",
      guests: 60,
      budget: 150_000,
    }),
  chat: (plan, messages) => {
    const asksAboutMoney = /budget|over|money|rebalance/i.test(messages.at(-1)?.text ?? "");
    const change = asksAboutMoney ? proposeRebalance(plan) : null;
    return Promise.resolve(
      change?.op === "moveBudget"
        ? {
            reply: `Move ${change.amount} from ${categoryName(plan, change.from)} to ${categoryName(plan, change.to)}.`,
            changes: [change],
          }
        : {
            reply: "Happy to help. Ask me to move budget, add a task or suggest ideas.",
            changes: [],
          },
    );
  },
  ideas: (brief) => Promise.resolve({ ideas: fallbackDraft(brief).ideas, sources: [] }),
};
