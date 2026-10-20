import { describe, expect, it } from "vitest";
import { googleCalendarUrl, planToIcs } from "./ics";

const plan = {
  brief: { name: "Ananya & Rohan's Wedding", date: "2027-02-14", city: "Hyderabad" },
  milestones: [{ id: "book-venue", title: "Book venue", due: "2026-11-01", done: false }],
  runSheet: [
    { time: "17:30", title: "Varmala" },
    { time: "18:30", title: "Pheras" },
  ],
};
const stamp = new Date("2026-10-20T08:00:00Z");

const unfold = (ics: string) => ics.replace(/\r\n /g, "");

describe("planToIcs", () => {
  it("produces a CRLF-delimited VCALENDAR", () => {
    const ics = planToIcs(plan, stamp);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("writes milestones as all-day events with an exclusive end date", () => {
    const ics = unfold(planToIcs(plan, stamp));
    expect(ics).toContain(
      "UID:book-venue@utsavos\r\nDTSTAMP:20261020T080000Z\r\nDTSTART;VALUE=DATE:20261101\r\nDTEND;VALUE=DATE:20261102\r\nSUMMARY:Book venue",
    );
  });

  it("adds the celebration itself, with its city, on the event date", () => {
    const ics = unfold(planToIcs(plan, stamp));
    expect(ics).toContain("DTSTART;VALUE=DATE:20270214");
    expect(ics).toContain("LOCATION:Hyderabad");
  });

  it("schedules run-sheet items on the event day, each ending when the next begins", () => {
    const ics = unfold(planToIcs(plan, stamp));
    expect(ics).toContain("DTSTART:20270214T173000\r\nDTEND:20270214T183000\r\nSUMMARY:Varmala");
    expect(ics).toContain("DTSTART:20270214T183000\r\nDTEND:20270214T193000\r\nSUMMARY:Pheras");
  });

  it("escapes commas, semicolons, backslashes and newlines in text", () => {
    const ics = planToIcs(
      {
        ...plan,
        milestones: [
          { id: "x", title: "Mehendi, sangeet; a\\b\nnext", due: "2026-11-01", done: false },
        ],
      },
      stamp,
    );
    expect(unfold(ics)).toContain("SUMMARY:Mehendi\\, sangeet\\; a\\\\b\\nnext");
  });

  it("folds lines to at most 75 octets without splitting multi-byte characters", () => {
    const title = "संगीत की तैयारी और रिहर्सल के लिए कोरियोग्राफर से मिलें";
    const ics = planToIcs(
      { ...plan, milestones: [{ id: "x", title, due: "2026-11-01", done: false }] },
      stamp,
    );
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(unfold(ics)).toContain(`SUMMARY:${title}`);
  });
});

describe("googleCalendarUrl", () => {
  it("builds an all-day Google Calendar template link", () => {
    const url = new URL(
      googleCalendarUrl({ title: "Book venue", date: "2026-11-01", location: "Pune" }),
    );
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Book venue");
    expect(url.searchParams.get("dates")).toBe("20261101/20261102");
    expect(url.searchParams.get("location")).toBe("Pune");
  });
});
