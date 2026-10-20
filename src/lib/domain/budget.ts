import type { BudgetLine } from "./schema";
import { slugify } from "./slug";

export interface BudgetSplit {
  category: string;
  percent: number;
}

export interface BudgetSummary {
  allocated: number;
  spent: number;
  remaining: number;
  overruns: { id: string; category: string; over: number }[];
}

/**
 * Turns a percentage split (from Gemini, so possibly not summing to 100) into whole-unit
 * allocations that add up to exactly `total`, using the largest-remainder method.
 */
export function allocateBudget(total: number, splits: BudgetSplit[]): BudgetLine[] {
  if (!(total > 0)) throw new Error("Budget total must be positive");

  const merged = new Map<string, { category: string; percent: number }>();
  for (const { category, percent } of splits) {
    const id = slugify(category);
    if (!id || !(percent > 0)) continue;
    const existing = merged.get(id);
    if (existing) existing.percent += percent;
    else merged.set(id, { category: category.trim(), percent });
  }
  if (merged.size === 0) throw new Error("Budget needs at least one category");

  const entries = [...merged.entries()];
  const percentSum = entries.reduce((acc, [, s]) => acc + s.percent, 0);
  const raw = entries.map(([, s]) => (total * s.percent) / percentSum);
  const allocated = raw.map(Math.floor);

  let leftover = total - allocated.reduce((a, b) => a + b, 0);
  const byFraction = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (const { index } of byFraction) {
    if (leftover <= 0) break;
    allocated[index]! += 1;
    leftover -= 1;
  }

  return entries.map(([id, s], i) => ({
    id,
    category: s.category,
    allocated: allocated[i]!,
    spent: 0,
  }));
}

export function summarizeBudget(lines: BudgetLine[]): BudgetSummary {
  let allocated = 0;
  let spent = 0;
  const overruns: BudgetSummary["overruns"] = [];
  for (const line of lines) {
    allocated += line.allocated;
    spent += line.spent;
    if (line.spent > line.allocated) {
      overruns.push({ id: line.id, category: line.category, over: line.spent - line.allocated });
    }
  }
  return { allocated, spent, remaining: allocated - spent, overruns };
}

/** Moves allocation between two categories; the plan's total never changes. */
export function moveBudget(
  lines: BudgetLine[],
  move: { from: string; to: string; amount: number },
): BudgetLine[] {
  const { from, to, amount } = move;
  if (from === to) throw new Error("Pick two different categories");
  if (!Number.isInteger(amount) || amount <= 0)
    throw new Error("Amount must be a positive whole number");

  const source = lines.find((l) => l.id === from);
  const target = lines.find((l) => l.id === to);
  if (!source || !target) throw new Error(`Unknown budget category: ${source ? to : from}`);
  if (amount > source.allocated) {
    throw new Error(`${source.category} has only ${source.allocated} to move`);
  }

  return lines.map((l) =>
    l.id === from
      ? { ...l, allocated: l.allocated - amount }
      : l.id === to
        ? { ...l, allocated: l.allocated + amount }
        : l,
  );
}
