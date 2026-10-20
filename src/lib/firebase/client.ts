import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(config).every(Boolean);

let services: Promise<{ auth: Auth; db: Firestore }> | undefined;

/** Loads Firebase on first use only, so pages that never sign in never download it. */
export function loadFirebase() {
  services ??= (async () => {
    const [{ initializeApp, getApps }, { getAuth }, { getFirestore }] = await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      import("firebase/firestore"),
    ]);
    const app = getApps()[0] ?? initializeApp(config);
    return { auth: getAuth(app), db: getFirestore(app) };
  })();
  return services;
}
