import { describe, expect, it, vi } from "vitest";

const initializeApp = vi.fn(() => ({ name: "app" }));
vi.mock("firebase/app", () => ({ initializeApp, getApps: () => [] }));
vi.mock("firebase/auth", () => ({ getAuth: () => ({ kind: "auth" }) }));
vi.mock("firebase/firestore", () => ({ getFirestore: () => ({ kind: "db" }) }));

describe("loadFirebase", () => {
  it("initialises Firebase once, on first use, and reuses it", async () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "k");
    const { loadFirebase } = await import("./client");
    expect(initializeApp).not.toHaveBeenCalled();
    const first = await loadFirebase();
    const second = await loadFirebase();
    expect(first).toBe(second);
    expect(first).toEqual({ auth: { kind: "auth" }, db: { kind: "db" } });
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });
});
