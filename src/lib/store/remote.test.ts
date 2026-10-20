import { beforeEach, describe, expect, it, vi } from "vitest";
import { weddingPlan } from "@/test/fixtures";
import { deleteRemotePlan, listRemotePlans, saveRemotePlan } from "./remote";

const fs = vi.hoisted(() => ({
  collection: vi.fn((_db: unknown, ...path: string[]) => path.join("/")),
  doc: vi.fn((col: string, id: string) => `${col}/${id}`),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));
vi.mock("firebase/firestore", () => fs);
vi.mock("@/lib/firebase/client", () => ({ loadFirebase: async () => ({ db: {} }) }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("remote plan store", () => {
  it("keeps each person's plans under users/{uid}/plans", async () => {
    await saveRemotePlan("u1", weddingPlan);
    expect(fs.setDoc).toHaveBeenCalledWith(`users/u1/plans/${weddingPlan.id}`, weddingPlan);
    await deleteRemotePlan("u1", weddingPlan.id);
    expect(fs.deleteDoc).toHaveBeenCalledWith(`users/u1/plans/${weddingPlan.id}`);
  });

  it("returns only documents that are valid plans", async () => {
    fs.getDocs.mockResolvedValue({
      docs: [{ data: () => weddingPlan }, { data: () => ({ id: "junk" }) }],
    });
    expect(await listRemotePlans("u1")).toEqual([weddingPlan]);
  });
});
