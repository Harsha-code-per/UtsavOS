import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/components/app/AuthProvider";
import { usePlanActions, usePlanList } from "@/components/app/usePlans";
import { weddingPlan } from "@/test/fixtures";
import { PlanList } from "./PlanList";

vi.mock("@/components/app/usePlans", () => ({ usePlanList: vi.fn(), usePlanActions: vi.fn() }));
vi.mock("@/components/app/AuthProvider", () => ({ useAuth: vi.fn() }));
const remove = vi.fn();

beforeEach(() => {
  remove.mockReset();
  vi.mocked(usePlanList).mockReturnValue([weddingPlan]);
  vi.mocked(usePlanActions).mockReturnValue({
    remove,
    save: vi.fn(),
    apply: vi.fn(),
    saveState: "device",
  });
  vi.mocked(useAuth).mockReturnValue({
    status: "signedOut",
    user: null,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
});

describe("PlanList", () => {
  it("links each plan to its dashboard", () => {
    render(<PlanList />);
    expect(screen.getByRole("link", { name: new RegExp(weddingPlan.brief.name) })).toHaveAttribute(
      "href",
      `/plan/${weddingPlan.id}`,
    );
  });

  it("asks in the page before deleting, and deletes only on confirmation", async () => {
    const user = userEvent.setup();
    render(<PlanList />);
    await user.click(screen.getByRole("button", { name: `Delete ${weddingPlan.brief.name}` }));

    const confirm = screen.getByRole("group", { name: /delete .* can't be undone/i });
    const yes = within(confirm).getByRole("button", { name: "Delete plan" });
    expect(yes).toHaveFocus();
    expect(remove).not.toHaveBeenCalled();

    await user.click(yes);
    expect(remove).toHaveBeenCalledWith(weddingPlan.id);
  });

  it("keeps the plan when the person changes their mind", async () => {
    const user = userEvent.setup();
    render(<PlanList />);
    const ask = screen.getByRole("button", { name: `Delete ${weddingPlan.brief.name}` });
    await user.click(ask);
    await user.click(screen.getByRole("button", { name: "Keep" }));
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: `Delete ${weddingPlan.brief.name}` })).toHaveFocus();
  });

  it("invites a first plan, and a sign-in for plans made elsewhere", () => {
    vi.mocked(usePlanList).mockReturnValue([]);
    render(<PlanList />);
    expect(screen.getByText(/No plans yet/)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to bring those plans here/)).toBeInTheDocument();
  });

  it("announces loading while stored plans are read", () => {
    vi.mocked(usePlanList).mockReturnValue(null);
    render(<PlanList />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your plans");
  });
});
