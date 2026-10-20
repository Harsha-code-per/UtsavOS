import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { putDescription } from "@/lib/store/handoff";
import { useQuickFill } from "./useQuickFill";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { parseBrief: vi.fn() },
}));
const parseBrief = vi.mocked(api.parseBrief);

beforeEach(() => {
  parseBrief.mockReset();
  sessionStorage.clear();
});

describe("useQuickFill", () => {
  it("fills the form from the description and says how many fields it set", async () => {
    parseBrief.mockResolvedValue({ patch: { city: "Pune", guests: 60 } });
    const fill = vi.fn(() => 2);
    const { result } = renderHook(() => useQuickFill(fill, false));
    await act(() => result.current.run("Beti ka birthday, Pune, 60 log"));

    expect(fill).toHaveBeenCalledWith({ city: "Pune", guests: 60 });
    expect(result.current.status).toEqual({
      state: "done",
      message: "Filled 2 fields from your description. Check them below.",
    });
  });

  it("asks for more detail when nothing could be filled", async () => {
    parseBrief.mockResolvedValue({ patch: {} });
    const { result } = renderHook(() => useQuickFill(() => 0, false));
    await act(() => result.current.run("a party"));
    expect(result.current.status.message).toMatch(/Try adding the date, city or guest count/);
  });

  it("needs a few words before calling Gemini", async () => {
    const { result } = renderHook(() => useQuickFill(() => 0, false));
    await act(() => result.current.run(" hi "));
    expect(parseBrief).not.toHaveBeenCalled();
    expect(result.current.status.state).toBe("error");
  });

  it("shows the reason when the request fails", async () => {
    parseBrief.mockRejectedValue(new Error("Too many requests."));
    const { result } = renderHook(() => useQuickFill(() => 0, false));
    await act(() => result.current.run("A wedding in Goa"));
    expect(result.current.status).toEqual({ state: "error", message: "Too many requests." });
  });

  it("runs straight away with a description handed over from the landing page", async () => {
    parseBrief.mockResolvedValue({ patch: { city: "Goa" } });
    putDescription("A beach wedding in Goa");
    const { result } = renderHook(() => useQuickFill(() => 1, true));
    await waitFor(() => expect(result.current.status.state).toBe("done"));
    expect(result.current.description).toBe("A beach wedding in Goa");
    expect(parseBrief).toHaveBeenCalledWith("A beach wedding in Goa");
  });
});
