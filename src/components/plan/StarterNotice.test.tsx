import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { weddingPlan } from "@/test/fixtures";
import { StarterNotice } from "./StarterNotice";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  api: { draftPlan: vi.fn() },
}));
const draftPlan = vi.mocked(api.draftPlan);

beforeEach(() => {
  draftPlan.mockReset();
});

describe("StarterNotice", () => {
  it("renders nothing for plans Gemini drafted", () => {
    const { container } = render(
      <StarterNotice plan={weddingPlan} starter={false} onRedrafted={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("redrafts the same brief with Gemini and keeps the plan's id", async () => {
    draftPlan.mockResolvedValue({ plan: { ...weddingPlan, id: "fresh" }, source: "gemini" });
    const onRedrafted = vi.fn();
    render(<StarterNotice plan={weddingPlan} starter onRedrafted={onRedrafted} />);
    expect(screen.getByRole("status")).toHaveTextContent(/starter plan/);

    await userEvent.click(screen.getByRole("button", { name: "Redraft with Gemini" }));
    expect(draftPlan).toHaveBeenCalledWith(weddingPlan.brief);
    expect(onRedrafted).toHaveBeenCalledWith(expect.objectContaining({ id: weddingPlan.id }));
    expect(screen.getByRole("status")).toHaveTextContent("Redrafted with Gemini.");
  });

  it("keeps the plan and says why when Gemini is still busy", async () => {
    draftPlan.mockResolvedValue({ plan: weddingPlan, source: "template", notice: "Still busy." });
    const onRedrafted = vi.fn();
    render(<StarterNotice plan={weddingPlan} starter onRedrafted={onRedrafted} />);
    await userEvent.click(screen.getByRole("button", { name: "Redraft with Gemini" }));
    expect(onRedrafted).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Still busy.");
  });

  it("explains a failed request", async () => {
    draftPlan.mockRejectedValue(new Error("You seem to be offline."));
    render(<StarterNotice plan={weddingPlan} starter onRedrafted={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Redraft with Gemini" }));
    expect(screen.getByRole("status")).toHaveTextContent("You seem to be offline.");
  });
});
