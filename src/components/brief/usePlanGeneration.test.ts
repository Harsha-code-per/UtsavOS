import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { weddingBrief, weddingPlan } from "@/test/fixtures";
import { usePlanGeneration } from "./usePlanGeneration";

const push = vi.fn();
const save = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/app/usePlans", () => ({ usePlanActions: () => ({ save }) }));
vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { draftPlan: vi.fn() },
}));
const draftPlan = vi.mocked(api.draftPlan);

beforeEach(() => {
  push.mockReset();
  save.mockReset();
  draftPlan.mockReset();
});

describe("usePlanGeneration", () => {
  it("saves the drafted plan and opens it when the animation finishes", async () => {
    draftPlan.mockResolvedValue({ plan: weddingPlan, source: "gemini" });
    const { result } = renderHook(() => usePlanGeneration());
    await act(() => result.current.start(weddingBrief));

    expect(save).toHaveBeenCalledWith(weddingPlan);
    expect(result.current.generating).toMatchObject({ done: true });
    act(() => result.current.finish());
    expect(push).toHaveBeenCalledWith(`/plan/${weddingPlan.id}`);
  });

  it("flags starter plans in the URL so the dashboard can offer a redraft", async () => {
    draftPlan.mockResolvedValue({ plan: weddingPlan, source: "template", notice: "Busy." });
    const { result } = renderHook(() => usePlanGeneration());
    await act(() => result.current.start(weddingBrief));
    act(() => result.current.finish());
    expect(push).toHaveBeenCalledWith(`/plan/${weddingPlan.id}?starter=1`);
  });

  it("shows the error and closes the dialog when drafting fails", async () => {
    draftPlan.mockRejectedValue(new Error("You seem to be offline."));
    const { result } = renderHook(() => usePlanGeneration());
    await act(() => result.current.start(weddingBrief));
    expect(result.current.generating).toBeNull();
    expect(result.current.error).toBe("You seem to be offline.");
  });

  it("cancels the request on stop, without reporting an error", async () => {
    let signal: AbortSignal | undefined;
    draftPlan.mockImplementation((_brief, s) => {
      signal = s;
      return new Promise((_, reject) => {
        s?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    });
    const { result } = renderHook(() => usePlanGeneration());
    let pending: Promise<void> | undefined;
    act(() => {
      pending = result.current.start(weddingBrief);
    });
    expect(result.current.generating).toEqual({ done: false });

    await act(async () => {
      result.current.stop();
      await pending;
    });
    expect(signal?.aborted).toBe(true);
    expect(result.current.generating).toBeNull();
    expect(result.current.error).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
});
