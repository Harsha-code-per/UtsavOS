import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadLocalPlans } from "@/lib/store/local";
import { deleteRemotePlan, saveRemotePlan } from "@/lib/store/remote";
import { setSaveStatus } from "@/lib/store/save-status";
import { nth, weddingPlan } from "@/test/fixtures";
import { useAuth } from "./AuthProvider";
import { usePlanActions, usePlanList } from "./usePlans";

vi.mock("./AuthProvider", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/store/remote", () => ({ saveRemotePlan: vi.fn(), deleteRemotePlan: vi.fn() }));
const signedIn = (yes: boolean) => {
  vi.mocked(useAuth).mockReturnValue({
    status: yes ? "signedIn" : "signedOut",
    user: yes ? { uid: "u1", name: "Asha" } : null,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
};

beforeEach(() => {
  localStorage.clear();
  setSaveStatus("device");
  vi.mocked(saveRemotePlan).mockReset().mockResolvedValue();
  vi.mocked(deleteRemotePlan).mockReset().mockResolvedValue();
  signedIn(false);
});

describe("usePlanActions", () => {
  it("saves on this device only when signed out", () => {
    const { result } = renderHook(() => usePlanActions());
    act(() => result.current.save(weddingPlan));
    expect(loadLocalPlans().map((p) => p.id)).toEqual([weddingPlan.id]);
    expect(saveRemotePlan).not.toHaveBeenCalled();
    expect(result.current.saveState).toBe("device");
  });

  it("also saves to the account when signed in, reporting saving then saved", async () => {
    signedIn(true);
    const { result } = renderHook(() => usePlanActions());
    act(() => result.current.save(weddingPlan));
    expect(result.current.saveState).toBe("saving");
    await waitFor(() => expect(result.current.saveState).toBe("saved"));
    expect(saveRemotePlan).toHaveBeenCalledWith("u1", weddingPlan);
  });

  it("keeps the device copy and reports the problem when the account save fails", async () => {
    signedIn(true);
    vi.mocked(saveRemotePlan).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => usePlanActions());
    act(() => result.current.save(weddingPlan));
    await waitFor(() => expect(result.current.saveState).toBe("error"));
    expect(loadLocalPlans()).toHaveLength(1);
  });

  it("applies several changes in order and saves the result once", () => {
    const { result } = renderHook(() => usePlanActions());
    const task = nth(weddingPlan.milestones, 0);
    act(() =>
      result.current.apply(
        weddingPlan,
        { op: "toggleMilestone", id: task.id },
        { op: "addMilestone", title: "Mehendi trial", due: "2027-02-01" },
      ),
    );
    const [saved] = loadLocalPlans();
    expect(saved?.milestones.find((m) => m.id === task.id)?.done).toBe(true);
    expect(saved?.milestones.some((m) => m.title === "Mehendi trial")).toBe(true);
  });

  it("refuses a change that doesn't apply, and saves nothing", () => {
    const { result } = renderHook(() => usePlanActions());
    expect(() =>
      result.current.apply(weddingPlan, { op: "toggleMilestone", id: "no-such-task" }),
    ).toThrow();
    expect(loadLocalPlans()).toEqual([]);
  });

  it("removes a plan here and, when signed in, from the account", async () => {
    signedIn(true);
    const { result } = renderHook(() => usePlanActions());
    act(() => result.current.save(weddingPlan));
    await act(() => result.current.remove(weddingPlan.id));
    expect(loadLocalPlans()).toEqual([]);
    expect(deleteRemotePlan).toHaveBeenCalledWith("u1", weddingPlan.id);
  });

  it("still removes the device copy if the account delete fails", async () => {
    signedIn(true);
    vi.mocked(deleteRemotePlan).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => usePlanActions());
    act(() => result.current.save(weddingPlan));
    await act(() => result.current.remove(weddingPlan.id));
    expect(loadLocalPlans()).toEqual([]);
  });
});

describe("usePlanList", () => {
  it("lists the plans stored on this device and updates when one is saved", () => {
    const list = renderHook(() => usePlanList());
    const actions = renderHook(() => usePlanActions());
    expect(list.result.current).toEqual([]);
    act(() => actions.result.current.save(weddingPlan));
    expect(list.result.current?.map((p) => p.id)).toEqual([weddingPlan.id]);
  });
});
