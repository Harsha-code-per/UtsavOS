import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { weddingPlan } from "@/test/fixtures";
import { TimelinePanel } from "./TimelinePanel";

const first = weddingPlan.milestones[0]!;

describe("TimelinePanel", () => {
  it("toggles a task when its checkbox is used", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockReturnValue(null);
    render(<TimelinePanel plan={weddingPlan} onChange={onChange} />);
    await user.click(screen.getByLabelText(first.title));
    expect(onChange).toHaveBeenCalledWith({ op: "toggleMilestone", id: first.id });
  });

  it("links every task to Google Calendar, opening safely in a new tab", () => {
    render(<TimelinePanel plan={weddingPlan} onChange={vi.fn()} />);
    const link = screen.getByRole("link", {
      name: new RegExp(`Add “${first.title}” to Google Calendar`),
    });
    expect(link).toHaveAttribute("href", expect.stringContaining("calendar.google.com"));
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("adds a task with a due date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn().mockReturnValue(null);
    render(<TimelinePanel plan={weddingPlan} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(screen.getByText("Add a task name and a date.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Task"), "Sangeet rehearsal");
    await user.type(screen.getByLabelText("Due"), "2027-02-10");
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(onChange).toHaveBeenCalledWith({
      op: "addMilestone",
      title: "Sangeet rehearsal",
      due: "2027-02-10",
    });
  });

  it("shows the run sheet for the day", () => {
    render(<TimelinePanel plan={weddingPlan} onChange={vi.fn()} />);
    const sheet = screen.getByRole("region", { name: /Run sheet/ });
    expect(within(sheet).getByText(weddingPlan.runSheet[0]!.title)).toBeInTheDocument();
  });

  it("downloads an .ics calendar file", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:ics");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<TimelinePanel plan={weddingPlan} onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Download calendar (.ics)" }));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
