import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { weddingPlan } from "@/test/fixtures";
import { AddTaskForm } from "./AddTaskForm";

describe("AddTaskForm", () => {
  it("adds a named task with its due date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn(() => null);
    render(<AddTaskForm plan={weddingPlan} onChange={onChange} />);
    await user.type(screen.getByLabelText("Task"), "  Mehendi trial ");
    await user.type(screen.getByLabelText("Due"), "2027-02-01");
    await user.click(screen.getByRole("button", { name: "Add task" }));

    expect(onChange).toHaveBeenCalledWith({
      op: "addMilestone",
      title: "Mehendi trial",
      due: "2027-02-01",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Added “Mehendi trial”.");
    expect(screen.getByLabelText("Task")).toHaveValue("");
  });

  it("limits the date picker to the event day and needs both fields", async () => {
    const onChange = vi.fn(() => null);
    render(<AddTaskForm plan={weddingPlan} onChange={onChange} />);
    expect(screen.getByLabelText("Due")).toHaveAttribute("max", weddingPlan.brief.date);
    await userEvent.type(screen.getByLabelText("Task"), "Book DJ");
    await userEvent.click(screen.getByRole("button", { name: "Add task" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Add a task name and a date.");
  });
});
