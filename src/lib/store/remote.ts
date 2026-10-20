import { PlanSchema, type Plan } from "@/lib/domain/schema";
import { loadFirebase } from "@/lib/firebase/client";

// Firestore layout: users/{uid}/plans/{planId}; access is enforced by firestore.rules.
async function plansCollection(uid: string) {
  const [{ db }, { collection }] = await Promise.all([
    loadFirebase(),
    import("firebase/firestore"),
  ]);
  return collection(db, "users", uid, "plans");
}

export async function listRemotePlans(uid: string): Promise<Plan[]> {
  const { getDocs } = await import("firebase/firestore");
  const snapshot = await getDocs(await plansCollection(uid));
  return snapshot.docs.flatMap((d) => {
    const plan = PlanSchema.safeParse(d.data());
    return plan.success ? [plan.data] : [];
  });
}

export async function saveRemotePlan(uid: string, plan: Plan): Promise<void> {
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(await plansCollection(uid), plan.id), plan);
}

export async function deleteRemotePlan(uid: string, id: string): Promise<void> {
  const { doc, deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(await plansCollection(uid), id));
}
