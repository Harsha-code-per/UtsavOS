import { describe, expect, it } from "vitest";
import { weddingPlan } from "@/test/fixtures";
import { describeChange, formatDate, formatMoney, parseAmount } from "./format";

describe("parseAmount", () => {
  it("reads digits through grouping and currency signs, and treats no digits as zero", () => {
    expect(parseAmount("₹1,50,000")).toBe(150000);
    expect(parseAmount("abc")).toBe(0);
    expect(parseAmount("")).toBe(0);
  });
});

describe("formatMoney", () => {
  it("uses Indian digit grouping for rupees and no decimals", () => {
    expect(formatMoney(2_500_000, "INR")).toBe("₹25,00,000");
  });

  it("uses Western grouping for other currencies", () => {
    expect(formatMoney(1500, "USD")).toBe("$1,500");
  });
});

describe("formatDate", () => {
  it("formats ISO dates without shifting the day", () => {
    expect(formatDate("2027-02-14")).toBe("14 Feb 2027");
  });
});

describe("describeChange", () => {
  const [first, second] = weddingPlan.budget;
  const milestone = weddingPlan.milestones[0]!;
  const vendor = weddingPlan.vendors[0]!;

  it("describes each kind of change in plain words, using names rather than ids", () => {
    expect(
      describeChange(
        { op: "moveBudget", from: first!.id, to: second!.id, amount: 25000 },
        weddingPlan,
      ),
    ).toBe(`Move ₹25,000 from ${first!.category} to ${second!.category}`);
    expect(describeChange({ op: "logSpend", id: first!.id, amount: 5000 }, weddingPlan)).toBe(
      `Log ₹5,000 spent on ${first!.category}`,
    );
    expect(
      describeChange(
        { op: "addMilestone", title: "Sangeet rehearsal", due: "2027-02-10" },
        weddingPlan,
      ),
    ).toBe("Add task “Sangeet rehearsal”, due 10 Feb 2027");
    expect(describeChange({ op: "toggleMilestone", id: milestone.id }, weddingPlan)).toBe(
      `Mark “${milestone.title}” as done`,
    );
    expect(
      describeChange({ op: "addVendor", category: "Mehendi artist", questions: [] }, weddingPlan),
    ).toBe("Add Mehendi artist to the vendor checklist");
    expect(
      describeChange(
        { op: "setVendorStatus", id: vendor.id, status: "booked", quote: 340000 },
        weddingPlan,
      ),
    ).toBe(`Mark ${vendor.category} as booked, quote ₹3,40,000`);
    expect(
      describeChange(
        { op: "addIdea", kind: "gift", title: "Seed paper cards", description: "x" },
        weddingPlan,
      ),
    ).toBe("Add gift idea “Seed paper cards”");
  });
});
