"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/app/AuthProvider";
import { applyChange } from "@/lib/domain/plan";
import type { Plan, PlanChange } from "@/lib/domain/schema";
import {
  getLocalPlansSnapshot,
  removeLocalPlan,
  saveLocalPlan,
  subscribeLocalPlans,
} from "./local";
import { deleteRemotePlan, saveRemotePlan } from "./remote";

export type SaveState = "device" | "saving" | "saved" | "error";

/**
 * Plans on this device. Signing in merges the account's plans into local storage
 * (see AuthProvider), so this one store serves guests and signed-in people alike.
 * Null until hydrated in the browser.
 */
export function usePlanList(): Plan[] | null {
  return useSyncExternalStore(subscribeLocalPlans, getLocalPlansSnapshot, () => null);
}

export function usePlanActions() {
  const { user } = useAuth();
  const [saveState, setSaveState] = useState<SaveState>("device");

  /** Saves on this device, then to Firestore when signed in. */
  const save = useCallback(
    (plan: Plan) => {
      saveLocalPlan(plan);
      if (!user) return setSaveState("device");
      setSaveState("saving");
      saveRemotePlan(user.uid, plan)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    },
    [user],
  );

  /** Applies changes in order and saves once; throws a readable message if one can't apply. */
  const apply = useCallback(
    (plan: Plan, ...changes: PlanChange[]) => {
      save(changes.reduce((current, change) => applyChange(current, change), plan));
    },
    [save],
  );

  const remove = useCallback(
    async (id: string) => {
      removeLocalPlan(id);
      if (user) await deleteRemotePlan(user.uid, id).catch(() => {});
    },
    [user],
  );

  return { save, apply, remove, saveState };
}
