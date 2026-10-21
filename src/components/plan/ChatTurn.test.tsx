import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PlanChange } from "@/lib/domain/schema";
import { nth, weddingPlan } from "@/test/fixtures";
import { ChatTurn } from "./ChatTurn";
import type { Turn } from "./useCoPlannerChat";

const venue = nth(weddingPlan.budget, 0);

const catering = nth(weddingPlan.budget, 1);
const changes: PlanChange[] = [
  { op: "moveBudget", from: venue.id, to: catering.id, amount: 10000 },
  { op: "addMilestone", title: "Mehendi trial", due: "2027-02-01" },
];
const proposal: Turn = { id: "t1", role: "model", text: "Here's a plan.", changes };

const renderTurn = (turn: Turn) => {
  const onApply = vi.fn();
  const onDismiss = vi.fn();
  render(<ChatTurn turn={turn} plan={weddingPlan} onApply={onApply} onDismiss={onDismiss} />);
  return { onApply, onDismiss };
};

describe("ChatTurn", () => {
  it("shows a plain message with no actions", () => {
    renderTurn({ id: "t0", role: "user", text: "Rebalance please" });
    expect(screen.getByText("Rebalance please")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("describes each proposed change in plain words and applies them together", async () => {
    const { onApply } = renderTurn(proposal);
    expect(
      screen.getByText(`Move ₹10,000 from ${venue.category} to ${catering.category}`),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Apply 2 changes" }));
    expect(onApply).toHaveBeenCalledWith(changes);
  });

  it("can be dismissed", async () => {
    const { onDismiss } = renderTurn({ ...proposal, changes: [nth(changes, 1)] });
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it.each([
    [{ kind: "applied" } as const, "Applied. Your plan is updated."],
    [{ kind: "dismissed" } as const, "Dismissed."],
    [{ kind: "failed", reason: "budget too small" } as const, "Couldn't apply: budget too small"],
  ])("replaces the buttons with the outcome once settled (%o)", (outcome, text) => {
    renderTurn({ ...proposal, outcome });
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
