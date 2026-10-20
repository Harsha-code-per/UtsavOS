import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { takeDescription } from "@/lib/store/handoff";
import { HeroBrief } from "./HeroBrief";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  push.mockReset();
});

describe("HeroBrief", () => {
  it("hands the description to the wizard without putting it in the URL", async () => {
    const user = userEvent.setup();
    render(<HeroBrief />);
    await user.type(
      screen.getByLabelText("Describe your celebration"),
      "Onam sadhya for 40 in Kochi",
    );
    await user.click(screen.getByRole("button", { name: "Draft my plan" }));
    expect(push).toHaveBeenCalledWith("/plan/new?from=description");
    expect(takeDescription()).toBe("Onam sadhya for 40 in Kochi");
  });

  it("goes to an empty brief when nothing was typed", async () => {
    const user = userEvent.setup();
    render(<HeroBrief />);
    await user.click(screen.getByRole("button", { name: "Draft my plan" }));
    expect(push).toHaveBeenCalledWith("/plan/new");
  });

  it("offers each event type as a starting point", () => {
    render(<HeroBrief />);
    expect(screen.getByRole("link", { name: "Birthday" })).toHaveAttribute(
      "href",
      "/plan/new?type=birthday",
    );
  });
});
