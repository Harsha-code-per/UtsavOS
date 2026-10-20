import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LandingMotion } from "./LandingMotion";

const lenis = { on: vi.fn(), raf: vi.fn(), destroy: vi.fn() };
const Lenis = vi.fn(function () {
  return lenis;
});
const ticker = { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() };
const revert = vi.fn();
vi.mock("lenis", () => ({ default: Lenis }));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: { update: vi.fn() } }));
vi.mock("gsap", () => ({
  gsap: { registerPlugin: vi.fn(), ticker, context: () => ({ revert }) },
}));

const prefersReducedMotion = (reduce: boolean) => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce") }));
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LandingMotion", () => {
  it("never loads the motion libraries when reduced motion is preferred", async () => {
    prefersReducedMotion(true);
    render(<LandingMotion />);
    await settle();
    expect(Lenis).not.toHaveBeenCalled();
  });

  it("starts smooth scrolling, and tears it down on unmount", async () => {
    prefersReducedMotion(false);
    const { unmount } = render(<LandingMotion />);
    await vi.waitFor(() => expect(Lenis).toHaveBeenCalled());
    expect(ticker.add).toHaveBeenCalled();

    unmount();
    expect(revert).toHaveBeenCalled();
    expect(ticker.remove).toHaveBeenCalled();
    expect(lenis.destroy).toHaveBeenCalled();
  });

  it("doesn't start at all when the page is left before the libraries load", async () => {
    prefersReducedMotion(false);
    const { unmount } = render(<LandingMotion />);
    unmount();
    await settle();
    await settle();
    expect(Lenis).not.toHaveBeenCalled();
    expect(ticker.add).not.toHaveBeenCalled();
  });
});
