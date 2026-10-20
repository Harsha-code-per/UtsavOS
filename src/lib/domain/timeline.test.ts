import { describe, expect, it } from "vitest";
import { addDays, daysUntil, scheduleMilestones } from "./timeline";

describe("daysUntil", () => {
  it("counts whole calendar days between ISO dates", () => {
    expect(daysUntil("2027-02-14", "2026-10-20")).toBe(117);
    expect(daysUntil("2026-10-20", "2026-10-20")).toBe(0);
    expect(daysUntil("2026-10-19", "2026-10-20")).toBe(-1);
  });
});

describe("addDays", () => {
  it("handles month and leap-year boundaries", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
  });
});

describe("scheduleMilestones", () => {
  const event = "2027-02-14";
  const today = "2026-10-20";

  it("dates each milestone by counting back from the event", () => {
    const [m] = scheduleMilestones(event, today, [{ title: "Final headcount", daysBefore: 14 }]);
    expect(m).toEqual({
      id: "final-headcount",
      title: "Final headcount",
      due: "2027-01-31",
      done: false,
    });
  });

  it("orders milestones earliest first", () => {
    const ms = scheduleMilestones(event, today, [
      { title: "Send invitations", daysBefore: 90 },
      { title: "Book venue", daysBefore: 110 },
    ]);
    expect(ms.map((m) => m.title)).toEqual(["Book venue", "Send invitations"]);
  });

  it("pulls milestones that would already be overdue forward to today", () => {
    const [m] = scheduleMilestones(event, today, [{ title: "Book venue", daysBefore: 200 }]);
    expect(m!.due).toBe(today);
  });

  it("never schedules after the event, whatever the model returns", () => {
    const [m] = scheduleMilestones(event, today, [{ title: "Thank-you notes", daysBefore: -3 }]);
    expect(m!.due).toBe(event);
  });

  it("gives repeated titles distinct ids", () => {
    const ms = scheduleMilestones(event, today, [
      { title: "Call caterer", daysBefore: 60 },
      { title: "Call caterer", daysBefore: 30 },
    ]);
    expect(ms.map((m) => m.id)).toEqual(["call-caterer", "call-caterer-2"]);
  });
});
