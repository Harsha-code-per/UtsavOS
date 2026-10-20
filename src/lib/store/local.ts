import { LooseObject, PlanSchema, type Plan } from "@/lib/domain/schema";

const KEY = "utsavos.plans";

function readAll(): Record<string, unknown> {
  try {
    const parsed = LooseObject.safeParse(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
    return parsed.success ? parsed.data : {};
  } catch {
    return {}; // corrupted JSON, or storage blocked (private mode)
  }
}

const CHANGE_EVENT = "utsavos:plans";

function writeAll(plans: Record<string, unknown>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(plans));
  } catch {
    // Storage full or blocked: signed-in plans still sync to Firestore.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const newestFirst = (a: Plan, b: Plan) => b.updatedAt.localeCompare(a.updatedAt);

/** Plans saved on this device, validated so tampered storage can't reach the UI. */
export function loadLocalPlans(): Plan[] {
  return Object.values(readAll())
    .flatMap((value) => {
      const plan = PlanSchema.safeParse(value);
      return plan.success ? [plan.data] : [];
    })
    .sort(newestFirst);
}

export function saveLocalPlan(plan: Plan): void {
  writeAll({ ...readAll(), [plan.id]: plan });
}

export function removeLocalPlan(id: string): void {
  writeAll(Object.fromEntries(Object.entries(readAll()).filter(([key]) => key !== id)));
}

/** Combines two copies of a plan list; the most recently updated version of each plan wins. */
export function mergePlans(a: Plan[], b: Plan[]): Plan[] {
  const byId = new Map<string, Plan>();
  for (const plan of [...a, ...b]) {
    const existing = byId.get(plan.id);
    if (!existing || plan.updatedAt > existing.updatedAt) byId.set(plan.id, plan);
  }
  return [...byId.values()].sort(newestFirst);
}

// useSyncExternalStore needs a stable snapshot: re-parse only when the stored string changes.
let snapshot: { raw: string | null; plans: Plan[] } = { raw: null, plans: [] };

export function getLocalPlansSnapshot(): Plan[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked: behave as empty.
  }
  if (raw !== snapshot.raw) snapshot = { raw, plans: loadLocalPlans() };
  return snapshot.plans;
}

/** Notifies on changes from this tab and from other tabs. */
export function subscribeLocalPlans(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
