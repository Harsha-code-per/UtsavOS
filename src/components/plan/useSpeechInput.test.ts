import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSpeechInput } from "./useSpeechInput";

class FakeRecognition {
  static last: FakeRecognition | undefined;
  lang = "";
  interimResults = true;
  onresult: ((e: { results: { transcript: string }[][] }) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start = vi.fn();
  abort = vi.fn();
  constructor() {
    FakeRecognition.last = this;
  }
}
const recognition = () => {
  if (!FakeRecognition.last) throw new Error("recognition was not created");
  return FakeRecognition.last;
};

afterEach(() => {
  vi.unstubAllGlobals();
  FakeRecognition.last = undefined;
});

const setup = (language: "en" | "hi" = "hi") => {
  const onText = vi.fn();
  const onError = vi.fn();
  const hook = renderHook(() => useSpeechInput({ language, onText, onError }));
  return { ...hook, onText, onError };
};

describe("useSpeechInput", () => {
  it("listens in the plan's language and hands over the final transcript", () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognition);
    const { result, onText } = setup("hi");
    act(() => result.current.listen());

    expect(recognition().lang).toBe("hi-IN");
    expect(recognition().interimResults).toBe(false);
    expect(recognition().start).toHaveBeenCalled();
    expect(result.current.listening).toBe(true);

    act(() => {
      recognition().onresult?.({ results: [[{ transcript: "संगीत के गाने" }]] });
      recognition().onend?.();
    });
    expect(onText).toHaveBeenCalledWith("संगीत के गाने");
    expect(result.current.listening).toBe(false);
  });

  it("explains a microphone problem", () => {
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    const { result, onError } = setup("en");
    act(() => result.current.listen());
    act(() => recognition().onerror?.());
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/microphone access/));
  });

  it("stops listening when the co-planner unmounts", () => {
    vi.stubGlobal("SpeechRecognition", FakeRecognition);
    const { result, unmount } = setup("en");
    act(() => result.current.listen());
    unmount();
    expect(recognition().abort).toHaveBeenCalled();
  });

  it("says so when the browser has no speech recognition", () => {
    const { result, onError } = setup();
    act(() => result.current.listen());
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/isn't available in this browser/));
    expect(result.current.listening).toBe(false);
  });
});
