import type { PlanChange } from "@/lib/domain/schema";

/** Applies changes to the open plan; returns why it couldn't, or null on success. */
export type ChangePlan = (...changes: PlanChange[]) => string | null;
