import { render, screen, waitFor } from "@testing-library/react";
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

describe("BriefWizard generation", () => {
  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

  async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Event name"), "Diwali at home");
    await user.type(screen.getByLabelText("Date"), inDays(30));
    await user.type(screen.getByLabelText("City"), "Bengaluru");
    await user.type(screen.getByLabelText("Guests"), "25");
    await user.type(screen.getByLabelText("Total budget"), "60000");
    await user.click(screen.getByRole("radio", { name: /Festival/ }));
    await user.click(screen.getByRole("button", { name: "Continue to style" }));
  }

  it("collects traditions and generates a validated brief", async () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    const user = userEvent.setup();
    const draftPlan = vi.mocked(api.draftPlan);
    draftPlan.mockImplementation(async () => {
      throw new Error("Gemini is unavailable right now.");
    });
    render(<BriefWizard fromDescription={false} />);
    await fillBasics(user);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Traditions and moments to plan for" }),
      ).toHaveFocus(),
    );
    await user.click(screen.getByRole("button", { name: "Rangoli" }));
    expect(screen.getByRole("button", { name: "Rangoli" })).toHaveAttribute("aria-pressed", "true");
    await user.type(screen.getByLabelText("Add your own tradition"), "Card party{Enter}");
    expect(screen.getByRole("button", { name: "Card party" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Generate my plan" }));
    expect(draftPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "festival",
        city: "Bengaluru",
        guests: 25,
        budget: 60000,
        traditions: ["Rangoli", "Card party"],
      }),
      expect.any(AbortSignal),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Gemini is unavailable right now.");
  });

  it("refuses dates in the past", async () => {
    const user = userEvent.setup();
    render(<BriefWizard fromDescription={false} />);
    await user.type(screen.getByLabelText("Date"), "2020-01-01");
    await user.click(screen.getByRole("button", { name: "Continue to style" }));
    expect(screen.getByText("Pick a date from today onwards.")).toBeInTheDocument();
  });

  it("goes back to the basics without losing answers", async () => {
    const user = userEvent.setup();
    render(<BriefWizard fromDescription={false} />);
    await fillBasics(user);
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("City")).toHaveValue("Bengaluru");
  });
});
