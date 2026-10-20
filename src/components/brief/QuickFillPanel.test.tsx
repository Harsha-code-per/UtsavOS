import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuickFillPanel } from "./QuickFillPanel";
import type { QuickFillStatus } from "./useQuickFill";

const renderPanel = (status: QuickFillStatus = { state: "idle" }, description = "") => {
  const props = { description, status, onDescription: vi.fn(), onRun: vi.fn() };
  render(<QuickFillPanel {...props} />);
  return props;
};

describe("QuickFillPanel", () => {
  it("passes typing up and runs quick-fill on submit", async () => {
    const user = userEvent.setup();
    const props = renderPanel({ state: "idle" }, "Beti ka birthday");
    await user.type(screen.getByLabelText("Describe it in any language"), "!");
    expect(props.onDescription).toHaveBeenCalledWith("Beti ka birthday!");
    await user.click(screen.getByRole("button", { name: "Fill the form for me" }));
    expect(props.onRun).toHaveBeenCalled();
  });

  it("disables the button while Gemini reads the description", () => {
    renderPanel({ state: "busy" });
    expect(screen.getByRole("button", { name: "Reading your description…" })).toBeDisabled();
  });

  it("announces the result", () => {
    renderPanel({ state: "done", message: "Filled 5 fields." });
    expect(screen.getByRole("status")).toHaveTextContent("Filled 5 fields.");
  });
});
