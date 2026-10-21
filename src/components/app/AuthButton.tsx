"use client";

import styles from "./AuthButton.module.css";
import { useAuth } from "./AuthProvider";

/** Google sign-in, which syncs plans across devices. Hidden when Firebase isn't configured. */
export function AuthButton() {
  const { status, user, error, signIn, signOut } = useAuth();
  if (status === "unavailable" || status === "loading") return null;

  return (
    <div className={styles.auth}>
      {user ? (
        <>
          <span className={styles.name}>{user.name}</span>
          <button
            type="button"
            className="btn btn-outline btn-small"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-primary btn-small" onClick={() => void signIn()}>
          Sign in with Google
        </button>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
