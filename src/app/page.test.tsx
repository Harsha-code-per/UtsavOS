import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import Home from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeAll(() => {
  // jsdom has no matchMedia; report reduced motion so the scroll scene stays static.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce"),
    media: query,
  }));
});

describe("landing page", () => {
  it("has one h1 and a heading for every section", () => {
    render(<Home />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    for (const name of [
      "One sentence holds a whole brief.",
      "Everything a celebration needs, in one living plan.",
      "From a sentence to a plan you can run.",
      "A co-planner that edits the plan, not just the chat.",
      "Your next celebration starts with one sentence.",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
  });

  it("names each part of the challenge: budgets, timelines, vendor checklists, ideas", () => {
    render(<Home />);
    for (const name of ["Budgets", "Timelines", "Vendor checklists", "Personalized ideas"]) {
      expect(screen.getByRole("heading", { level: 3, name })).toBeInTheDocument();
    }
  });

  it("shows the brief Gemini reads from the example sentence", () => {
    render(<Home />);
    const demo = screen.getByRole("region", { name: "One sentence holds a whole brief." });
    expect(within(demo).getByText("₹25,00,000")).toBeInTheDocument();
    expect(within(demo).getByText("Haldi, Sangeet")).toBeInTheDocument();
  });

  it("lists the four steps in order and links to start planning", () => {
    render(<Home />);
    const steps = screen.getByRole("region", { name: "From a sentence to a plan you can run." });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(4);
    const ctas = screen.getAllByRole("link", { name: "Plan a celebration" });
    expect(ctas.every((link) => link.getAttribute("href") === "/plan/new")).toBe(true);
  });

  it("describes the example budget chart for screen readers", () => {
    render(<Home />);
    expect(screen.getByRole("img", { name: /Budget split: catering 30%/ })).toBeInTheDocument();
  });
});
