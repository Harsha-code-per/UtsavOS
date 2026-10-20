import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { BriefWizard } from "./BriefWizard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/store/usePlans", () => ({ usePlanActions: () => ({ save: vi.fn() }) }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { parseBrief: vi.fn(), draftPlan: vi.fn() },
}));
const parseBrief = vi.mocked(api.parseBrief);

beforeEach(() => {
  parseBrief.mockReset();
});

describe("BriefWizard", () => {
  it("explains every missing field and focuses the first one", async () => {
    const user = userEvent.setup();
    render(<BriefWizard fromDescription={false} />);
    await user.click(screen.getByRole("button", { name: "Continue to style" }));

    expect(screen.getByText("Give the celebration a name.")).toBeInTheDocument();
    expect(screen.getByText("Add the city.")).toBeInTheDocument();
    expect(screen.getByText("Enter the number of guests, from 1 to 5,000.")).toBeInTheDocument();
    expect(screen.getByLabelText("Event name")).toHaveFocus();
    expect(screen.getByLabelText("Event name")).toHaveAttribute("aria-invalid", "true");
  });

  it("fills the brief from a free-text description with Gemini", async () => {
    const user = userEvent.setup();
    parseBrief.mockResolvedValue({
      patch: {
        type: "birthday",
        name: "Meera's first birthday",
        city: "Pune",
        guests: 60,
        budget: 150000,
      },
    });
    render(<BriefWizard fromDescription={false} />);

    await user.type(
      screen.getByLabelText("Describe it in any language"),
      "Beti ka birthday, Pune, 60 log",
    );
    await user.click(screen.getByRole("button", { name: "Fill the form for me" }));

    expect(await screen.findByText(/Filled 5 fields/)).toBeInTheDocument();
    expect(screen.getByLabelText("Event name")).toHaveValue("Meera's first birthday");
    expect(screen.getByLabelText("City")).toHaveValue("Pune");
    expect(screen.getByRole("radio", { name: /Birthday/ })).toBeChecked();
    expect(screen.getByText("₹1,50,000")).toBeInTheDocument();
  });

  it("shows a quick-fill failure without losing what was typed", async () => {
    const user = userEvent.setup();
    parseBrief.mockImplementation(async () => {
      throw new Error("Gemini is unavailable right now.");
    });
    render(<BriefWizard fromDescription={false} />);
    await user.type(screen.getByLabelText("Event name"), "Diwali at home");
    await user.type(screen.getByLabelText("Describe it in any language"), "Diwali party");
    await user.click(screen.getByRole("button", { name: "Fill the form for me" }));

    expect(await screen.findByText("Gemini is unavailable right now.")).toBeInTheDocument();
    expect(screen.getByLabelText("Event name")).toHaveValue("Diwali at home");
  });
});
