import { describe, expect, it } from "vitest";
import {
  groundingSources,
  jsonArrayIn,
  parseModelJson,
  proposalReply,
  stripEmphasis,
  validBriefPatch,
  validIdeas,
} from "./output";
import { AiError } from "./types";

describe("model output guards", () => {
  it("parses JSON and turns unreadable answers into a friendly AiError", () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
    expect(() => parseModelJson("not json")).toThrow(AiError);
    expect(() => parseModelJson(undefined)).toThrow(AiError);
  });

  it("finds the JSON array inside a prose answer", () => {
    expect(jsonArrayIn('Here you go:\n```json\n[{"x":1}]\n```')).toEqual([{ x: 1 }]);
  });

  it("keeps each brief field that validates and drops the rest", () => {
    const patch = validBriefPatch({
      city: "Pune",
      guests: 60,
      budget: -5,
      type: "party",
      extra: 1,
    });
    expect(patch).toEqual({ city: "Pune", guests: 60 });
    expect(validBriefPatch("nonsense")).toEqual({});
    expect(validBriefPatch(null)).toEqual({});
  });

  it("keeps only well-formed ideas", () => {
    const good = { kind: "menu", title: "Chaat counter", description: "Live pani puri." };
    expect(validIdeas([good, { kind: "spell", title: "x" }, 7])).toEqual([good]);
    expect(validIdeas({ not: "a list" })).toEqual([]);
  });

  it("cites only http(s) sources, once each, named by host when untitled", () => {
    const sources = groundingSources([
      { web: { uri: "https://a.example/x", title: "A" } },
      { web: { uri: "https://a.example/x", title: "A again" } },
      { web: { uri: "javascript:alert(1)" } },
      { web: { uri: "https://b.example/y" } },
      {},
    ]);
    expect(sources).toEqual([
      { uri: "https://a.example/x", title: "A" },
      { uri: "https://b.example/y", title: "b.example" },
    ]);
    expect(groundingSources()).toEqual([]);
  });

  it("strips Markdown emphasis but leaves ordinary asterisks and underscores", () => {
    expect(stripEmphasis("**Book** the _venue_ first.")).toBe("Book the venue first.");
    expect(stripEmphasis("5 * 3 guests, file_name")).toBe("5 * 3 guests, file_name");
  });

  it("answers in English for Latin-script messages and in the plan's language otherwise", () => {
    expect(proposalReply("hi", "Rebalance my budget")).toMatch(/^Here is what I'd change/);
    expect(proposalReply("hi", "बजट ठीक करो")).toMatch(/बदलाव/);
  });
});
