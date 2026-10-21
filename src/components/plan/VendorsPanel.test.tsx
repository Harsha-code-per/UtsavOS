import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { nth, weddingPlan } from "@/test/fixtures";
import { VendorsPanel } from "./VendorsPanel";

const vendor = nth(weddingPlan.vendors, 0);

describe("VendorsPanel", () => {
  it("updates a vendor's status straight away", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockReturnValue(null);
    render(<VendorsPanel plan={weddingPlan} onChange={onChange} />);
    await user.selectOptions(nth(screen.getAllByLabelText("Status"), 0), "booked");
    expect(onChange).toHaveBeenCalledWith({
      op: "setVendorStatus",
      id: vendor.id,
      status: "booked",
    });
  });

  it("saves a quote and confirms it in the plan's currency", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockReturnValue(null);
    render(<VendorsPanel plan={weddingPlan} onChange={onChange} />);
    await user.type(nth(screen.getAllByLabelText("Quote (INR)"), 0), "6,50,000");
    await user.click(nth(screen.getAllByRole("button", { name: "Save quote" }), 0));
    expect(onChange).toHaveBeenCalledWith({
      op: "setVendorStatus",
      id: vendor.id,
      status: vendor.status,
      quote: 650000,
    });
    expect(screen.getByText("Quote saved: ₹6,50,000.")).toBeInTheDocument();
  });

  it("shows the questions to ask each vendor", () => {
    render(<VendorsPanel plan={weddingPlan} onChange={vi.fn()} />);
    expect(screen.getByText(nth(vendor.questions, 0))).toBeInTheDocument();
  });

  it("adds a vendor, and explains why when it can't", async () => {
    const user = userEvent.setup();
    const onChange = vi
      .fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce("Mehendi artist is already on the checklist");
    render(<VendorsPanel plan={weddingPlan} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Add vendor" }));
    expect(screen.getByText(/Name the kind of vendor/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Kind of vendor"), "Mehendi artist");
    await user.click(screen.getByRole("button", { name: "Add vendor" }));
    expect(onChange).toHaveBeenCalledWith({
      op: "addVendor",
      category: "Mehendi artist",
      questions: [],
    });
    expect(screen.getByText("Added Mehendi artist.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Kind of vendor"), "Mehendi artist");
    await user.click(screen.getByRole("button", { name: "Add vendor" }));
    expect(screen.getByText("Mehendi artist is already on the checklist")).toBeInTheDocument();
  });
});
