import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/components/app/AuthProvider";
import { saveLocalPlan } from "@/lib/store/local";
import { nth, weddingPlan } from "@/test/fixtures";
import { PlanDashboard } from "./PlanDashboard";
import { PlanList } from "./PlanList";

// No Firebase config in tests: the app runs in device-only mode.
vi.mock("@/lib/firebase/client", () => ({ firebaseConfigured: false, loadFirebase: vi.fn() }));

const renderWithAuth = (ui: React.ReactNode) => render(<AuthProvider>{ui}</AuthProvider>);

beforeEach(() => {
  localStorage.clear();
});

describe("PlanDashboard", () => {
  it("explains what to do when the plan isn't on this device", () => {
    renderWithAuth(<PlanDashboard id="missing" starter={false} />);
    expect(screen.getByRole("heading", { name: /isn’t on this device/ })).toBeInTheDocument();
  });

  it("shows the plan with its stats and tabs", () => {
    saveLocalPlan(weddingPlan);
    renderWithAuth(<PlanDashboard id={weddingPlan.id} starter={false} />);
    expect(
      screen.getByRole("heading", { level: 1, name: weddingPlan.brief.name }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Wedding in Hyderabad/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Budget" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Saved on this device")).toBeInTheDocument();
  });

  it("saves changes made in a panel", async () => {
    const user = userEvent.setup();
    saveLocalPlan(weddingPlan);
    renderWithAuth(<PlanDashboard id={weddingPlan.id} starter={false} />);
    await user.click(screen.getByRole("tab", { name: "Timeline" }));
    await user.click(screen.getByLabelText(nth(weddingPlan.milestones, 0).title));
    expect(screen.getByText(`1/${weddingPlan.milestones.length}`)).toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem("utsavos.plans")!)[weddingPlan.id].milestones[0].done,
    ).toBe(true);
  });

  it("tells people when they are looking at a starter plan", () => {
    saveLocalPlan(weddingPlan);
    renderWithAuth(<PlanDashboard id={weddingPlan.id} starter />);
    expect(screen.getByText(/starter plan/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Redraft with Gemini" })).toBeInTheDocument();
  });
});

describe("PlanList", () => {
  it("invites people to start when there are no plans", () => {
    renderWithAuth(<PlanList />);
    expect(screen.getByText(/No plans yet/)).toBeInTheDocument();
  });

  it("lists saved plans and deletes one after confirmation", async () => {
    const user = userEvent.setup();
    saveLocalPlan(weddingPlan);
    renderWithAuth(<PlanList />);
    expect(
      screen.getByRole("link", { name: new RegExp(weddingPlan.brief.name) }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: `Delete ${weddingPlan.brief.name}` }));
    await user.click(screen.getByRole("button", { name: "Delete plan" }));
    expect(await screen.findByText(/No plans yet/)).toBeInTheDocument();
  });
});
