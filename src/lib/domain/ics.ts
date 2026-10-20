import type { Brief, Milestone, RunSheetItem } from "./schema";
import { addDays } from "./timeline";

interface CalendarSource {
  brief: Pick<Brief, "name" | "date" | "city">;
  milestones: Milestone[];
  runSheet: RunSheetItem[];
}

const compactDate = (iso: string) => iso.replaceAll("-", "");

// RFC 5545 §3.3.11 TEXT escaping.
const escapeText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const encoder = new TextEncoder();

// RFC 5545 §3.1: lines are at most 75 octets; continuations start with a space.
function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function plusMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}${String(total % 60).padStart(2, "0")}`;
}

function vevent(fields: [string, string][]): string[] {
  return ["BEGIN:VEVENT", ...fields.map(([k, v]) => `${k}:${v}`), "END:VEVENT"];
}

/** Serializes milestones, the event day and its run sheet as an iCalendar file. */
export function planToIcs(source: CalendarSource, now: Date): string {
  const { brief, milestones, runSheet } = source;
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const day = compactDate(brief.date);

  const allDay = (event: { uid: string; date: string; summary: string; location?: string }) =>
    vevent([
      ["UID", `${event.uid}@utsavos`],
      ["DTSTAMP", stamp],
      ["DTSTART;VALUE=DATE", compactDate(event.date)],
      ["DTEND;VALUE=DATE", compactDate(addDays(event.date, 1))],
      ["SUMMARY", escapeText(event.summary)],
      ...(event.location ? [["LOCATION", escapeText(event.location)] as [string, string]] : []),
    ]);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UtsavOS//Celebration Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...milestones.flatMap((m) => allDay({ uid: m.id, date: m.due, summary: m.title })),
    ...allDay({ uid: "event", date: brief.date, summary: brief.name, location: brief.city }),
    ...runSheet.flatMap((item, i) => {
      const next = runSheet[i + 1];
      const end =
        next && next.time > item.time ? next.time.replace(":", "") : plusMinutes(item.time, 60);
      return vevent([
        ["UID", `run-${i + 1}@utsavos`],
        ["DTSTAMP", stamp],
        ["DTSTART", `${day}T${item.time.replace(":", "")}00`],
        ["DTEND", `${day}T${end}00`],
        ["SUMMARY", escapeText(item.title)],
      ]);
    }),
    "END:VCALENDAR",
  ];

  return lines.map(fold).join("\r\n") + "\r\n";
}

/** A one-click "add to Google Calendar" link for an all-day item. */
export function googleCalendarUrl(item: {
  title: string;
  date: string;
  location?: string;
}): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: item.title,
    dates: `${compactDate(item.date)}/${compactDate(addDays(item.date, 1))}`,
  });
  if (item.location) params.set("location", item.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}
