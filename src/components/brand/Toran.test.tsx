import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TORAN_FLOWERS, Toran } from "./Toran";

const flowers = (container: HTMLElement) => container.querySelectorAll("[data-tone]");
const lit = (container: HTMLElement) => container.querySelectorAll("[data-lit]");

describe("Toran", () => {
  it("is decorative, hidden from assistive technology", () => {
    const { container } = render(<Toran />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("lights every flower by default, or the first n left to right", () => {
    const full = render(<Toran />);
    expect(flowers(full.container)).toHaveLength(TORAN_FLOWERS);
    expect(lit(full.container)).toHaveLength(TORAN_FLOWERS);

    const partial = render(<Toran lit={5} />);
    expect(lit(partial.container)).toHaveLength(5);
    expect(flowers(partial.container)[4]).toHaveAttribute("data-lit");
    expect(flowers(partial.container)[5]).not.toHaveAttribute("data-lit");
  });

  it("marks the unfurl animation only when asked", () => {
    expect(render(<Toran />).container.querySelector("[data-unfurl]")).toBeNull();
    expect(render(<Toran unfurl />).container.querySelector("[data-unfurl]")).not.toBeNull();
  });
});
