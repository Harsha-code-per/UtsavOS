import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { weddingPlan } from "../src/test/fixtures";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-utsavos",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const planDoc = (uid: string | null, owner = "alice", id = weddingPlan.id) => {
  const ctx = uid ? env.authenticatedContext(uid) : env.unauthenticatedContext();
  return doc(ctx.firestore(), "users", owner, "plans", id);
};

describe("plans", () => {
  it("lets a signed-in person save and read their own plan", async () => {
    await assertSucceeds(setDoc(planDoc("alice"), weddingPlan));
    await assertSucceeds(getDoc(planDoc("alice")));
  });

  it("hides a plan from everyone else", async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), "users", "alice", "plans", weddingPlan.id), weddingPlan),
    );
    await assertFails(getDoc(planDoc("mallory")));
    await assertFails(getDoc(planDoc(null)));
  });

  it("stops anyone writing into another person's plans", async () => {
    await assertFails(setDoc(planDoc("mallory", "alice"), weddingPlan));
    await assertFails(setDoc(planDoc(null, "alice"), weddingPlan));
  });

  it("rejects plans whose document id does not match the plan id", async () => {
    await assertFails(setDoc(planDoc("alice", "alice", "other-id"), weddingPlan));
  });

  it("rejects malformed plans", async () => {
    await assertFails(setDoc(planDoc("alice"), { ...weddingPlan, budget: "lots" }));
    await assertFails(setDoc(planDoc("alice"), { ...weddingPlan, isAdmin: true }));
    await assertFails(
      setDoc(planDoc("alice"), { ...weddingPlan, brief: { ...weddingPlan.brief, budget: -1 } }),
    );
  });
});

describe("everything else", () => {
  it("is closed", async () => {
    const ctx = env.authenticatedContext("alice");
    await assertFails(setDoc(doc(ctx.firestore(), "users", "alice"), { role: "admin" }));
    await assertFails(getDoc(doc(ctx.firestore(), "config", "app")));
  });
});
