import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api/client";
import { weddingPlan } from "@/test/fixtures";
import { IdeasPanel } from "./IdeasPanel";

vi.mock("@/lib/api/client", () => ({ api: { ideas: vi.fn() } }));
const ideas = vi.mocked(api.ideas);
const idea = {
  kind: "menu" as const,
  title: "Irani chai counter",
  description: "With Osmania biscuits.",
};

beforeEach(() => {
  ideas.mockReset();
});

describe("IdeasPanel", () => {
  it("shows the plan's ideas", () => {
    render(<IdeasPanel plan={weddingPlan} onChange={vi.fn()} />);
    expect(screen.getByText(weddingPlan.ideas[0]!.title)).toBeInTheDocument();
  });

  it("fetches local ideas with sources and adds one to the plan", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockReturnValue(null);
    ideas.mockResolvedValue({
      ideas: [idea],
      sources: [{ uri: "https://example.com/chai", title: "Chai guide" }],
    });
    render(<IdeasPanel plan={weddingPlan} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Get local ideas" }));
    expect(await screen.findByText("Irani chai counter")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Chai guide/ })).toHaveAttribute(
      "href",
      "https://example.com/chai",
    );

    await user.click(screen.getByRole("button", { name: "Add to plan" }));
    expect(onChange).toHaveBeenCalledWith({ op: "addIdea", ...idea });
    expect(screen.getByRole("button", { name: "Added to plan" })).toBeDisabled();
  });

  it("only cites Google Search when sources came back", async () => {
    const user = userEvent.setup();
    ideas.mockResolvedValue({ ideas: [idea], sources: [] });
    render(<IdeasPanel plan={weddingPlan} onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Get local ideas" }));
    await screen.findByText("Irani chai counter");
    expect(screen.queryByText("Sources from Google Search")).not.toBeInTheDocument();
  });

  it("explains when ideas could not be fetched", async () => {
    const user = userEvent.setup();
    ideas.mockImplementation(async () => {
      throw new Error("Gemini is unavailable right now.");
    });
    render(<IdeasPanel plan={weddingPlan} onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Get local ideas" }));
    expect(await screen.findByText("Gemini is unavailable right now.")).toBeInTheDocument();
  });
});
