import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeneratingDialog } from "./GeneratingDialog";

const stages = ["Splitting the budget…", "Counting back…", "Choosing vendors…", "Gathering ideas…"];

beforeEach(() => {
  vi.useFakeTimers();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
});
afterEach(() => {
  vi.useRealTimers();
});

const renderDialog = (done = false) => {
  const props = { stages, done, onFinished: vi.fn(), onStop: vi.fn() };
  const view = render(<GeneratingDialog {...props} />);
  return { ...view, props };
};

describe("GeneratingDialog", () => {
  it("opens as a modal and announces the first stage", () => {
    renderDialog();
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Splitting the budget…");
  });

  it("moves through the stages while waiting, without claiming to finish", () => {
    renderDialog();
    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.getByRole("status")).toHaveTextContent("Gathering ideas…");
    expect(Number(screen.getByRole("progressbar").getAttribute("value"))).toBeLessThan(93);
  });

  it("completes the garland, then hands over", () => {
    const { props, rerender } = renderDialog();
    rerender(<GeneratingDialog {...props} done />);
    expect(screen.getByRole("status")).toHaveTextContent("Your plan is ready.");
    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
    expect(props.onFinished).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(700));
    expect(props.onFinished).toHaveBeenCalled();
  });

  it("stops from the button or the Escape key", () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    fireEvent(
      screen.getByRole("dialog", { hidden: true }),
      new Event("cancel", { cancelable: true }),
    );
    expect(props.onStop).toHaveBeenCalledTimes(2);
  });
});
