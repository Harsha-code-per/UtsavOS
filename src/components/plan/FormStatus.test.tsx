import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormStatus, failure, outcome } from "./FormStatus";

describe("FormStatus", () => {
  it("turns a change result into a success or a problem", () => {
    expect(outcome(null, "Saved.")).toEqual({ ok: true, text: "Saved." });
    expect(outcome("Over budget.", "Saved.")).toEqual({ ok: false, text: "Over budget." });
    expect(failure("Add a date.")).toEqual({ ok: false, text: "Add a date." });
  });

  it("keeps an empty live region ready, then announces the result", () => {
    const { rerender } = render(<FormStatus status={null} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    rerender(<FormStatus status={{ ok: true, text: "Added." }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Added.");
    expect(screen.getByRole("status")).toHaveAttribute("data-ok");
  });

  it("marks problems as not ok", () => {
    render(<FormStatus status={failure("Enter an amount.")} />);
    expect(screen.getByRole("status")).not.toHaveAttribute("data-ok");
  });
});
