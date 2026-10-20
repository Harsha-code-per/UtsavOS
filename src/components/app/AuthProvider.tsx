"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { firebaseConfigured, loadFirebase } from "@/lib/firebase/client";
import { loadLocalPlans, mergePlans, saveLocalPlan } from "@/lib/store/local";
import { listRemotePlans, saveRemotePlan } from "@/lib/store/remote";
import { setSaveStatus } from "@/lib/store/save-status";

export interface User {
  uid: string;
  name: string;
}

interface AuthValue {
  status: "loading" | "signedOut" | "signedIn" | "unavailable";
  user: User | null;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Uploads this device's plans and downloads the account's, keeping the newest copy of each. */
async function syncPlans(uid: string) {
  const local = loadLocalPlans();
  const remote = await listRemotePlans(uid);
  const remoteById = new Map(remote.map((p) => [p.id, p]));
  const uploads = mergePlans(local, remote).flatMap((plan) => {
    saveLocalPlan(plan);
    const copy = remoteById.get(plan.id);
    return !copy || copy.updatedAt < plan.updatedAt ? [saveRemotePlan(uid, plan)] : [];
  });
  await Promise.all(uploads);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthValue["status"]>(
    firebaseConfigured ? "loading" : "unavailable",
  );
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    // Mutable box: the async loader may finish after the effect has been cleaned up.
    const subscription: { cancelled: boolean; unsubscribe?: () => void } = { cancelled: false };
    void (async () => {
      const [{ auth }, { onAuthStateChanged }] = await Promise.all([
        loadFirebase(),
        import("firebase/auth"),
      ]);
      if (subscription.cancelled) return;
      subscription.unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (!fbUser) {
          setUser(null);
          setStatus("signedOut");
          setSaveStatus("device");
          return;
        }
        setUser({ uid: fbUser.uid, name: fbUser.displayName ?? fbUser.email ?? "You" });
        setStatus("signedIn");
        setSaveStatus("saving");
        syncPlans(fbUser.uid)
          .then(() => setSaveStatus("saved"))
          .catch(() => {
            setSaveStatus("error");
            setError("Couldn't sync your plans. They're safe on this device.");
          });
      });
    })();
    return () => {
      subscription.cancelled = true;
      subscription.unsubscribe?.();
    };
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const [{ auth }, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([
        loadFirebase(),
        import("firebase/auth"),
      ]);
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      const code = typeof e === "object" && e !== null && "code" in e ? e.code : undefined;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("Sign-in didn't work. Allow pop-ups for this site and try again.");
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    const [{ auth }, { signOut: fbSignOut }] = await Promise.all([
      loadFirebase(),
      import("firebase/auth"),
    ]);
    await fbSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({ status, user, error, signIn, signOut }),
    [status, user, error, signIn, signOut],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
