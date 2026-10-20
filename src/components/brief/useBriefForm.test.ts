import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useBriefForm } from "./useBriefForm";

describe("useBriefForm", () => {
  it("starts empty on the requested event type", () => {
    const { result } = renderHook(() => useBriefForm("birthday"));
    expect(result.current.form).toMatchObject({ type: "birthday", name: "", currency: "INR" });
  });

  it("shows errors only for the fields it validates, and clears one when it is edited", () => {
    const { result } = renderHook(() => useBriefForm());
    act(() => {
      result.current.validate(["name", "city"]);
    });
    expect(Object.keys(result.current.errors)).toEqual(["name", "city"]);
    expect(result.current.fieldProps("name")).toMatchObject({
      id: "brief-name",
      "aria-invalid": true,
      "aria-describedby": "brief-name-error",
    });

    act(() => result.current.set("name", "Diya's first birthday"));
    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.fieldProps("name")["aria-invalid"]).toBeUndefined();
  });

  it("fills fields from a quick-fill patch and marks them as filled", () => {
    const { result } = renderHook(() => useBriefForm());
    let count = 0;
    act(() => {
      count = result.current.fill({ city: "Pune", guests: 60 });
    });
    expect(count).toBe(2);
    expect(result.current.form).toMatchObject({ city: "Pune", guests: "60" });
    expect(result.current.fieldProps("city")["data-filled"]).toBe("");
    expect(result.current.fieldProps("name")["data-filled"]).toBeUndefined();
  });
});
