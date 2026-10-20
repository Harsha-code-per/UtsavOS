import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { weddingPlan } from "@/test/fixtures";
import { LogPaymentForm } from "./LogPaymentForm";

const [, catering] = weddingPlan.budget;

describe("LogPaymentForm", () => {
  it("logs the typed amount against the chosen category and confirms it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn(() => null);
    render(<LogPaymentForm plan={weddingPlan} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText("Category"), catering!.id);
    await user.type(screen.getByLabelText(/Amount/), "1,20,000");
    await user.click(screen.getByRole("button", { name: "Log payment" }));

    expect(onChange).toHaveBeenCalledWith({ op: "logSpend", id: catering!.id, amount: 120000 });
    expect(screen.getByRole("status")).toHaveTextContent(
      `Logged ₹1,20,000 on ${catering!.category}.`,
    );
    expect(screen.getByLabelText(/Amount/)).toHaveValue("");
  });

  it("asks for an amount before changing anything", async () => {
    const onChange = vi.fn(() => null);
    render(<LogPaymentForm plan={weddingPlan} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Log payment" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Enter the amount you spent.");
  });

  it("shows why a change was refused and keeps the typed amount", async () => {
    const user = userEvent.setup();
    render(<LogPaymentForm plan={weddingPlan} onChange={() => "That category is gone."} />);
    await user.type(screen.getByLabelText(/Amount/), "500");
    await user.click(screen.getByRole("button", { name: "Log payment" }));
    expect(screen.getByRole("status")).toHaveTextContent("That category is gone.");
    expect(screen.getByLabelText(/Amount/)).toHaveValue("500");
  });
});
