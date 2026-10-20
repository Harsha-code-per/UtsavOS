import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("is a home link named by its wordmark, with a decorative mark", () => {
    render(<Logo tone="ivory" />);
    const link = screen.getByRole("link", { name: "UtsavOS" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("data-tone", "ivory");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
