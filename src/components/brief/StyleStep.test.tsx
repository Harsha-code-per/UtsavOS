import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { StyleStep } from "./StyleStep";
import { useBriefForm } from "./useBriefForm";

function Harness({
  submitError = null,
  onBack = vi.fn(),
}: {
  submitError?: string | null;
  onBack?: () => void;
}) {
  const brief = useBriefForm("wedding");
  const headingRef = useRef<HTMLHeadingElement>(null);
  return (
    <>
      <StyleStep {...brief} headingRef={headingRef} submitError={submitError} onBack={onBack} />
      <output data-testid="form">{JSON.stringify(brief.form)}</output>
    </>
  );
}
const form = () =>
  JSON.parse(screen.getByTestId("form").textContent ?? "{}") as Record<string, unknown>;

describe("StyleStep", () => {
  it("suggests traditions for the event type as toggle chips", async () => {
    render(<Harness />);
    const haldi = screen.getByRole("button", { name: "Haldi" });
    expect(haldi).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(haldi);
    expect(haldi).toHaveAttribute("aria-pressed", "true");
    expect(form().traditions).toEqual(["Haldi"]);
    await userEvent.click(haldi);
    expect(form().traditions).toEqual([]);
  });

  it("adds a tradition of the person's own with Enter or the Add button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Add your own tradition"), "Annaprashan{Enter}");
    await user.type(screen.getByLabelText("Add your own tradition"), "Kanyadaan");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(form().traditions).toEqual(["Annaprashan", "Kanyadaan"]);
    expect(screen.getByRole("button", { name: "Annaprashan" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Add your own tradition")).toHaveValue("");
  });

  it("labels each plan language in its own script", async () => {
    render(<Harness />);
    const hindi = screen.getByRole("option", { name: "हिन्दी" });
    expect(hindi).toHaveAttribute("lang", "hi");
    await userEvent.selectOptions(screen.getByLabelText("Plan language"), "hi");
    expect(form().language).toBe("hi");
  });

  it("goes back, and shows why generation failed", async () => {
    const onBack = vi.fn();
    render(<Harness submitError="Gemini is busy." onBack={onBack} />);
    expect(screen.getByText("Gemini is busy.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(onBack).toHaveBeenCalled();
  });
});
