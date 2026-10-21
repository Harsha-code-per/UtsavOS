"use client";

import { useState } from "react";
import type { Plan } from "@/lib/domain/schema";
import type { ChangePlan } from "./change-plan";
import { FormStatus, failure, outcome, type Status } from "./FormStatus";
import panel from "./panel.module.css";

/** Adds a task to the timeline, due on or before the event. */
export function AddTaskForm({ plan, onChange }: { plan: Plan; onChange: ChangePlan }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [status, setStatus] = useState<Status | null>(null);

  function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = title.trim();
    if (!name || !due) {
      setStatus(failure("Add a task name and a date."));
      return;
    }
    const error = onChange({ op: "addMilestone", title: name, due });
    setStatus(outcome(error, `Added “${name}”.`));
    if (!error) setTitle("");
  }

  return (
    <form className={panel.inlineForm} onSubmit={submit}>
      <h3 className={panel.formTitle}>Add a task</h3>
      <div className="field">
        <label htmlFor="task-title">Task</label>
        <input
          id="task-title"
          className="input"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="task-due">Due</label>
        <input
          id="task-due"
          className="input"
          type="date"
          max={plan.brief.date}
          value={due}
          onChange={(e) => setDue(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-ink">
        Add task
      </button>
      <FormStatus status={status} />
    </form>
  );
}
