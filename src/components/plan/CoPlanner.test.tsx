import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { nth, weddingPlan } from "@/test/fixtures";
import { CoPlanner } from "./CoPlanner";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { chat: vi.fn() },
}));
const chat = vi.mocked(api.chat);

const venue = nth(weddingPlan.budget, 0);

const catering = nth(weddingPlan.budget, 1);
const move = { op: "moveBudget" as const, from: venue.id, to: catering.id, amount: 5000 };

beforeEach(() => {
  chat.mockReset();
});

describe("CoPlanner", () => {
  it("shows proposed changes in plain words and applies them only on approval", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockReturnValue(null);
    chat.mockResolvedValue({ reply: "Shift some venue money to catering.", changes: [move] });
    render(<CoPlanner plan={weddingPlan} onChange={onChange} question={null} />);

    await user.type(screen.getByLabelText("Message the co-planner"), "More for food please");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Shift some venue money to catering.")).toBeInTheDocument();
    expect(
      screen.getByText(`Move ₹5,000 from ${venue.category} to ${catering.category}`),
    ).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Apply change" }));
    expect(onChange).toHaveBeenCalledWith(move);
    expect(screen.getByText("Applied. Your plan is updated.")).toBeInTheDocument();
  });

  it("sends the conversation and the current plan to the API", async () => {
    const user = userEvent.setup();
    chat.mockResolvedValue({ reply: "Hello!", changes: [] });
    render(<CoPlanner plan={weddingPlan} onChange={vi.fn()} question={null} />);
    await user.click(screen.getByRole("button", { name: "What's due this week?" }));
    expect(chat).toHaveBeenCalledWith(weddingPlan, [
      { role: "user", text: "What's due this week?" },
    ]);
  });

  it("lets the person dismiss a proposal", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    chat.mockResolvedValue({ reply: "Idea", changes: [move] });
    render(
      <CoPlanner plan={weddingPlan} onChange={onChange} question={{ text: "rebalance", key: 1 }} />,
    );
    await user.click(await screen.findByRole("button", { name: "Dismiss" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Dismissed.")).toBeInTheDocument();
  });

  it("explains failures instead of failing silently", async () => {
    const user = userEvent.setup();
    chat.mockImplementation(async () => {
      throw new Error("Gemini is busy.");
    });
    render(<CoPlanner plan={weddingPlan} onChange={vi.fn()} question={null} />);
    await user.type(screen.getByLabelText("Message the co-planner"), "hi{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Gemini is busy.");
  });

  it("reports when an approved change can no longer apply", async () => {
    const user = userEvent.setup();
    chat.mockResolvedValue({ reply: "Do it", changes: [move] });
    render(
      <CoPlanner
        plan={weddingPlan}
        onChange={() => "Venue has only 0 to move"}
        question={{ text: "x", key: 2 }}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Apply change" }));
    expect(screen.getByText("Couldn't apply: Venue has only 0 to move")).toBeInTheDocument();
  });
});
