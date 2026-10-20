import { describe, expect, it, vi } from "vitest";
import { getSaveStatus, setSaveStatus, subscribeSaveStatus } from "./save-status";

describe("save status", () => {
  it("is shared across screens and notifies subscribers of changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSaveStatus(listener);
    setSaveStatus("saving");
    expect(getSaveStatus()).toBe("saving");
    setSaveStatus("saved");
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setSaveStatus("device");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
