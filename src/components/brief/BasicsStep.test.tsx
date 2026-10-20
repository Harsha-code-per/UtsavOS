import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { BasicsStep } from "./BasicsStep";
import { useBriefForm } from "./useBriefForm";

function Harness() {
  const brief = useBriefForm("wedding");
  const headingRef = useRef<HTMLHeadingElement>(null);
  return (
    <>
      <BasicsStep {...brief} headingRef={headingRef} />
      <button type="button" onClick={() => brief.validate(["name", "date", "city"])}>
        Check
      </button>
      <output data-testid="traditions">{brief.form.traditions.join(",")}</output>
    </>
  );
}

describe("BasicsStep", () => {
  it("offers the four event types as radios, with the chosen one checked", async () => {
    render(<Harness />);
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: /Wedding/ })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: /Community event/ }));
    expect(screen.getByRole("radio", { name: /Community event/ })).toBeChecked();
  });

  it("previews the typed budget in the chosen currency", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Total budget"), "150000");
    expect(screen.getByText("₹1,50,000")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Currency"), "USD");
    expect(screen.getByText("$150,000")).toBeInTheDocument();
  });

  it("links each error to its field and focuses the first one", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    const name = screen.getByLabelText("Event name");
    expect(name).toHaveFocus();
    expect(name).toHaveAccessibleDescription("Give the celebration a name.");
    expect(screen.getByLabelText("City")).toHaveAccessibleDescription("Add the city.");
  });

  it("doesn't let past dates be picked", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Date")).toHaveAttribute("min", expect.stringMatching(/^\d{4}-/));
  });
});
