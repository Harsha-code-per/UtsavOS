import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import type { PlanChange } from "@/lib/domain/schema";
import { weddingPlan } from "@/test/fixtures";
import { useCoPlannerChat } from "./useCoPlannerChat";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { chat: vi.fn() },
}));
const chat = vi.mocked(api.chat);
const change: PlanChange = { op: "addMilestone", title: "Mehendi trial", due: "2027-02-01" };

beforeEach(() => {
  chat.mockReset();
});

describe("useCoPlannerChat", () => {
  it("sends the plan with the conversation so far and adds the reply", async () => {
    chat.mockResolvedValue({ reply: "Done.", changes: [change] });
    const { result } = renderHook(() => useCoPlannerChat(weddingPlan));
    await act(() => result.current.send("  Add a mehendi trial  "));

    expect(chat).toHaveBeenCalledWith(weddingPlan, [{ role: "user", text: "Add a mehendi trial" }]);
    expect(result.current.turns.map((t) => [t.role, t.text])).toEqual([
      ["user", "Add a mehendi trial"],
      ["model", "Done."],
    ]);
    expect(result.current.turns[1]?.changes).toEqual([change]);
    expect(result.current.busy).toBe(false);
  });

  it("ignores blank messages", async () => {
    const { result } = renderHook(() => useCoPlannerChat(weddingPlan));
    await act(() => result.current.send("   "));
    expect(chat).not.toHaveBeenCalled();
    expect(result.current.turns).toEqual([]);
  });

  it("settles one proposal by id, leaving the others alone", async () => {
    chat.mockResolvedValue({ reply: "Here.", changes: [change] });
    const { result } = renderHook(() => useCoPlannerChat(weddingPlan));
    await act(() => result.current.send("one"));
    await act(() => result.current.send("two"));
    const [, first, , second] = result.current.turns;

    act(() => result.current.settle(first!.id, { kind: "applied" }));
    expect(result.current.turns[1]?.outcome).toEqual({ kind: "applied" });
    expect(result.current.turns[3]?.outcome).toBeUndefined();
    expect(second?.id).not.toBe(first?.id);
  });

  it("keeps the question and shows the error when the request fails", async () => {
    chat.mockRejectedValue(new Error("Gemini is busy."));
    const { result } = renderHook(() => useCoPlannerChat(weddingPlan));
    await act(() => result.current.send("Rebalance"));
    await waitFor(() => expect(result.current.error).toBe("Gemini is busy."));
    expect(result.current.turns).toHaveLength(1);
  });

  it("sends only the most recent 12 messages", async () => {
    chat.mockResolvedValue({ reply: "ok", changes: [] });
    const { result } = renderHook(() => useCoPlannerChat(weddingPlan));
    for (let i = 0; i < 7; i++) await act(() => result.current.send(`m${i}`));
    expect(chat.mock.lastCall?.[1]).toHaveLength(12);
    expect(chat.mock.lastCall?.[1].at(-1)).toEqual({ role: "user", text: "m6" });
  });
});
