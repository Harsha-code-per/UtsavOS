import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { weddingPlan } from "@/test/fixtures";
import { BudgetPanel } from "./BudgetPanel";

describe("BudgetPanel", () => {
  it("logs a payment against the chosen category", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockReturnValue(null);
    render(<BudgetPanel plan={weddingPlan} onChange={onChange} onAsk={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText("Category"), "decor");
    await user.type(screen.getByLabelText("Amount (INR)"), "25,000");
    await user.click(screen.getByRole("button", { name: "Log payment" }));

    expect(onChange).toHaveBeenCalledWith({ op: "logSpend", id: "decor", amount: 25000 });
    expect(screen.getByRole("status")).toHaveTextContent("Logged ₹25,000 on Decor.");
  });

  it("asks for an amount instead of logging nothing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BudgetPanel plan={weddingPlan} onChange={onChange} onAsk={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Log payment" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Enter the amount you spent.");
  });

  it("flags overspending and hands it to the co-planner", async () => {
    const user = userEvent.setup();
    const onAsk = vi.fn();
    const overspent = {
      ...weddingPlan,
      budget: weddingPlan.budget.map((l) =>
        l.id === "decor" ? { ...l, spent: l.allocated + 40000 } : l,
      ),
    };
    render(<BudgetPanel plan={overspent} onChange={vi.fn()} onAsk={onAsk} />);

    expect(screen.getByText(/Decor is over by ₹40,000/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ask the co-planner to rebalance" }));
    expect(onAsk).toHaveBeenCalledWith(expect.stringContaining("Decor is over by ₹40,000"));
  });
});
