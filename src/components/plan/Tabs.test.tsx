import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Tabs, type TabId } from "./Tabs";

function Harness() {
  const [tab, setTab] = useState<TabId>("budget");
  return <Tabs active={tab} onChange={setTab} />;
}

describe("Tabs", () => {
  it("moves selection and focus with arrow keys, Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const budget = screen.getByRole("tab", { name: "Budget" });
    expect(budget).toHaveAttribute("aria-selected", "true");

    await user.click(budget);
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Timeline" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Ideas" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Budget" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}{Home}");
    expect(screen.getByRole("tab", { name: "Budget" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps only the selected tab in the tab order", () => {
    render(<Harness />);
    const tabbable = screen.getAllByRole("tab").filter((t) => t.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
  });
});
