import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyChange } from "@/lib/domain/plan";
import { weddingPlan } from "@/test/fixtures";
import { PlanHeader } from "./PlanHeader";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T09:00:00"));
});
afterEach(() => {
  vi.useRealTimers();
});

const stat = (label: string) =>
  within(screen.getByText(label).parentElement!).getByRole("definition");

describe("PlanHeader", () => {
  it("summarises the event and counts down to it", () => {
    render(<PlanHeader plan={weddingPlan} saveState="device" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ananya & Rohan");
    expect(
      screen.getByText(/Wedding in Hyderabad on 14 Feb 2027, for 300 guests/),
    ).toBeInTheDocument();
    expect(stat("Days to go")).toHaveTextContent("117");
  });

  it("reports budget used, tasks done and vendors booked", () => {
    const [line] = weddingPlan.budget;
    const [task] = weddingPlan.milestones;
    const [vendor] = weddingPlan.vendors;
    let plan = applyChange(weddingPlan, { op: "logSpend", id: line!.id, amount: 250_000 });
    plan = applyChange(plan, { op: "toggleMilestone", id: task!.id });
    plan = applyChange(plan, { op: "setVendorStatus", id: vendor!.id, status: "booked" });
    render(<PlanHeader plan={plan} saveState="saved" />);

    expect(stat("Budget used")).toHaveTextContent("10%");
    expect(stat("Tasks done")).toHaveTextContent(`1/${plan.milestones.length}`);
    expect(stat("Vendors booked")).toHaveTextContent(`1/${plan.vendors.length}`);
  });

  it.each([
    ["device", "Saved on this device"],
    ["saving", "Saving…"],
    ["saved", "Saved to your account"],
    ["error", "Couldn't reach your account. Saved on this device."],
  ] as const)("announces the %s save state", (saveState, text) => {
    render(<PlanHeader plan={weddingPlan} saveState={saveState} />);
    expect(screen.getByRole("status")).toHaveTextContent(text);
  });

  it("counts days since a past event", () => {
    vi.setSystemTime(new Date("2027-02-20T09:00:00"));
    render(<PlanHeader plan={weddingPlan} saveState="device" />);
    expect(stat("Days since")).toHaveTextContent("6");
  });
});
