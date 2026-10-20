import type { BriefPatch } from "@/lib/ai/types";
import { formatDate, formatMoney } from "@/lib/domain/format";
import { BriefSchema, type Brief } from "@/lib/domain/schema";

/** The brief as typed into the form: numbers stay text until submitted. */
export interface BriefForm {
  type: Brief["type"];
  name: string;
  date: string;
  city: string;
  guests: string;
  budget: string;
  currency: Brief["currency"];
  vibe: string;
  traditions: string[];
  diet: string;
  language: Brief["language"];
}

export type BriefField = keyof BriefForm;
export type FieldErrors = Partial<Record<BriefField, string>>;

export const BASICS_FIELDS: BriefField[] = [
  "type",
  "name",
  "date",
  "city",
  "guests",
  "budget",
  "currency",
];
export const STYLE_FIELDS: BriefField[] = ["vibe", "traditions", "diet", "language"];
export const ALL_FIELDS: BriefField[] = [...BASICS_FIELDS, ...STYLE_FIELDS];
const FIELD_SET = new Set<PropertyKey>(ALL_FIELDS);
const isField = (key: PropertyKey): key is BriefField => FIELD_SET.has(key);

export const DIETS = [
  "Vegetarian",
  "Veg and non-veg",
  "Jain options needed",
  "Vegan options needed",
];
export const MAX_TRADITIONS = 12;

const MESSAGES: FieldErrors = {
  name: "Give the celebration a name.",
  date: "Pick the date.",
  city: "Add the city.",
  guests: "Enter the number of guests, from 1 to 5,000.",
  budget: "Enter the total budget as a whole number.",
};

export const emptyForm = (type: Brief["type"] = "wedding"): BriefForm => ({
  type,
  name: "",
  date: "",
  city: "",
  guests: "",
  budget: "",
  currency: "INR",
  vibe: "",
  traditions: [],
  diet: "Veg and non-veg",
  language: "en",
});

/** "1,50,000" -> 150000; anything without digits -> 0. */
export const parseAmount = (text: string) => Number(text.replace(/[^\d]/g, "")) || 0;

/** The form as an unvalidated brief, ready for `BriefSchema`. */
export const toBrief = (form: BriefForm): unknown => ({
  ...form,
  guests: parseAmount(form.guests),
  budget: parseAmount(form.budget),
});

/** Schema errors for the given fields, as plain-language messages (first problem per field). */
function schemaErrors(form: BriefForm, fields: BriefField[]): FieldErrors {
  const result = BriefSchema.safeParse(toBrief(form));
  const errors: FieldErrors = {};
  for (const issue of result.success ? [] : result.error.issues) {
    const field = issue.path[0];
    if (field !== undefined && isField(field) && fields.includes(field)) {
      errors[field] ??= MESSAGES[field] ?? "Check this field.";
    }
  }
  return errors;
}

/** Plain-language errors for the given fields, including dates already past. */
export function validateFields(form: BriefForm, fields: BriefField[], today: string): FieldErrors {
  const errors = schemaErrors(form, fields);
  if (fields.includes("date") && form.date && form.date < today) {
    errors.date = "Pick a date from today onwards.";
  }
  return errors;
}

/** Brief fields that a quick-fill patch sets (patches never hold undefined values). */
export const patchedFields = (patch: BriefPatch): BriefField[] =>
  Object.keys(patch).filter(isField);

const mergeTraditions = (current: string[], extra: string[]) =>
  [...new Set([...current, ...extra])].slice(0, MAX_TRADITIONS);

/** Applies a quick-fill patch: numbers become text, traditions are merged. */
export function applyPatch(form: BriefForm, patch: BriefPatch): BriefForm {
  const { guests, budget, traditions, ...rest } = patch;
  const next: BriefForm = { ...form };
  for (const [key, value] of Object.entries(rest)) {
    if (isField(key)) Object.assign(next, { [key]: value });
  }
  if (guests !== undefined) next.guests = String(guests);
  if (budget !== undefined) next.budget = String(budget);
  if (traditions) next.traditions = mergeTraditions(form.traditions, traditions);
  return next;
}

export const toggleTradition = (current: string[], tradition: string) =>
  current.includes(tradition)
    ? current.filter((t) => t !== tradition)
    : mergeTraditions(current, [tradition]);

export function addTradition(current: string[], text: string): string[] {
  const tradition = text.trim();
  return tradition ? mergeTraditions(current, [tradition]) : current;
}

/** What the generating dialog says while Gemini works, in the brief's own terms. */
export function draftStages(form: BriefForm): string[] {
  const budget = parseAmount(form.budget);
  return [
    `Splitting your ${budget ? formatMoney(budget, form.currency) : ""} budget…`,
    `Counting back from ${form.date ? formatDate(form.date) : "the big day"}…`,
    "Choosing the vendors you'll need…",
    `Gathering ideas for ${form.city || "your city"}…`,
  ];
}
