import { beforeEach, describe, expect, it, vi } from "vitest";
import { weddingPlan } from "@/test/fixtures";
import {
  getLocalPlansSnapshot,
  loadLocalPlans,
  mergePlans,
  removeLocalPlan,
  saveLocalPlan,
  subscribeLocalPlans,
} from "./local";

const older = { ...weddingPlan, updatedAt: "2026-10-20T08:00:00.000Z" };
const newer = {
  ...weddingPlan,
  updatedAt: "2026-10-21T08:00:00.000Z",
  brief: { ...weddingPlan.brief, guests: 350 },
};

beforeEach(() => {
  localStorage.clear();
});

describe("local plan storage", () => {
  it("round-trips plans through localStorage", () => {
    saveLocalPlan(weddingPlan);
    expect(loadLocalPlans()).toEqual([weddingPlan]);
  });

  it("replaces a plan with the same id and removes plans", () => {
    saveLocalPlan(older);
    saveLocalPlan(newer);
    expect(loadLocalPlans()).toEqual([newer]);
    removeLocalPlan(weddingPlan.id);
    expect(loadLocalPlans()).toEqual([]);
  });

  it("ignores corrupted or tampered storage instead of crashing", () => {
    localStorage.setItem("utsavos.plans", "{not json");
    expect(loadLocalPlans()).toEqual([]);
    localStorage.setItem(
      "utsavos.plans",
      JSON.stringify({ a: { id: "a", evil: true }, [weddingPlan.id]: weddingPlan }),
    );
    expect(loadLocalPlans()).toEqual([weddingPlan]);
  });
});

describe("mergePlans", () => {
  it("keeps the most recently updated copy of each plan, newest first", () => {
    const other = { ...weddingPlan, id: "plan-2", updatedAt: "2026-10-19T00:00:00.000Z" };
    expect(mergePlans([older, other], [newer])).toEqual([newer, other]);
    expect(mergePlans([newer], [older])).toEqual([newer]);
  });
});

describe("external store", () => {
  it("returns the same snapshot until storage changes, then notifies subscribers", () => {
    const first = getLocalPlansSnapshot();
    expect(getLocalPlansSnapshot()).toBe(first);

    const listener = vi.fn();
    const unsubscribe = subscribeLocalPlans(listener);
    saveLocalPlan(weddingPlan);
    expect(listener).toHaveBeenCalled();
    expect(getLocalPlansSnapshot()).toEqual([weddingPlan]);
    expect(getLocalPlansSnapshot()).not.toBe(first);
    unsubscribe();
  });
});
