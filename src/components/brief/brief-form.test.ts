import { describe, expect, it } from "vitest";
import {
  ALL_FIELDS,
  BASICS_FIELDS,
  MAX_TRADITIONS,
  applyPatch,
  draftStages,
  emptyForm,
  patchedFields,
  toBrief,
  toggleTradition,
  addTradition,
  validateFields,
} from "./brief-form";

const filled = {
  ...emptyForm("birthday"),
  name: "Meera's first birthday",
  date: "2027-01-16",
  city: "Pune",
  guests: "60",
  budget: "1,50,000",
};

describe("emptyForm", () => {
  it("starts with the requested event type and sensible defaults", () => {
    expect(emptyForm("festival")).toMatchObject({
      type: "festival",
      currency: "INR",
      language: "en",
      traditions: [],
    });
    expect(emptyForm().type).toBe("wedding");
  });
});

describe("toBrief", () => {
  it("turns typed numbers like 1,50,000 into integers", () => {
    expect(toBrief(filled)).toMatchObject({ guests: 60, budget: 150000 });
  });
});

describe("validateFields", () => {
  it("reports each invalid field once, only for the fields asked about", () => {
    const errors = validateFields(emptyForm(), BASICS_FIELDS, "2026-10-20");
    expect(Object.keys(errors).sort()).toEqual(["budget", "city", "date", "guests", "name"]);
    expect(errors.city).toBe("Add the city.");
    expect(validateFields(emptyForm(), ["vibe"], "2026-10-20")).toEqual({});
  });

  it("rejects dates in the past", () => {
    expect(validateFields({ ...filled, date: "2026-01-01" }, ALL_FIELDS, "2026-10-20")).toEqual({
      date: "Pick a date from today onwards.",
    });
  });

  it("accepts a complete brief", () => {
    expect(validateFields(filled, ALL_FIELDS, "2026-10-20")).toEqual({});
  });
});

describe("quick-fill patches", () => {
  it("lists only the fields the patch actually sets", () => {
    expect(patchedFields({ city: "Pune", guests: 60 }).sort()).toEqual(["city", "guests"]);
  });

  it("applies numbers as text and merges traditions without duplicates", () => {
    const form = applyPatch(
      { ...emptyForm(), traditions: ["Haldi"] },
      {
        type: "wedding",
        guests: 300,
        budget: 2500000,
        traditions: ["Haldi", "Sangeet"],
      },
    );
    expect(form).toMatchObject({
      guests: "300",
      budget: "2500000",
      traditions: ["Haldi", "Sangeet"],
    });
  });
});

describe("traditions", () => {
  it("toggles a tradition on and off", () => {
    expect(toggleTradition(["Haldi"], "Sangeet")).toEqual(["Haldi", "Sangeet"]);
    expect(toggleTradition(["Haldi", "Sangeet"], "Haldi")).toEqual(["Sangeet"]);
  });

  it("adds custom traditions once, trimmed, up to the limit", () => {
    expect(addTradition(["Haldi"], "  Annaprashan ")).toEqual(["Haldi", "Annaprashan"]);
    expect(addTradition(["Haldi"], "Haldi")).toEqual(["Haldi"]);
    expect(addTradition(["Haldi"], "   ")).toEqual(["Haldi"]);
    const full = Array.from({ length: MAX_TRADITIONS }, (_, i) => `T${i}`);
    expect(addTradition(full, "One more")).toHaveLength(MAX_TRADITIONS);
  });
});

describe("draftStages", () => {
  it("describes the drafting steps using the brief's own details", () => {
    const [budget, date, , city] = draftStages(filled);
    expect(budget).toContain("₹1,50,000");
    expect(date).toContain("16 Jan 2027");
    expect(city).toContain("Pune");
  });
});
