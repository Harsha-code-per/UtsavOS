import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadLocalPlans, saveLocalPlan } from "@/lib/store/local";
import { listRemotePlans, saveRemotePlan } from "@/lib/store/remote";
import { getSaveStatus } from "@/lib/store/save-status";
import { weddingPlan } from "@/test/fixtures";
import { AuthButton } from "./AuthButton";
import { AuthProvider } from "./AuthProvider";

const auth = vi.hoisted(() => ({
  listener: null as null | ((user: unknown) => void),
  /** Fires the auth state listener the provider registered. */
  emit(user: unknown) {
    if (!auth.listener) throw new Error("AuthProvider has not subscribed to auth state yet");
    auth.listener(user);
  },
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  firebaseConfigured: true,
  loadFirebase: async () => ({ auth: {}, db: {} }),
}));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {},
  onAuthStateChanged: (_auth: unknown, cb: (user: unknown) => void) => {
    auth.listener = cb;
    return () => {};
  },
  signInWithPopup: auth.signInWithPopup,
  signOut: auth.signOut,
}));
vi.mock("@/lib/store/remote", () => ({
  listRemotePlans: vi.fn(async () => []),
  saveRemotePlan: vi.fn(async () => {}),
  deleteRemotePlan: vi.fn(async () => {}),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

const renderButton = async () => {
  render(
    <AuthProvider>
      <AuthButton />
    </AuthProvider>,
  );
  await waitFor(() => expect(auth.listener).not.toBeNull());
};

describe("AuthProvider and AuthButton", () => {
  it("offers Google sign-in when signed out", async () => {
    const user = userEvent.setup();
    await renderButton();
    auth.emit(null);
    await user.click(await screen.findByRole("button", { name: "Sign in with Google" }));
    expect(auth.signInWithPopup).toHaveBeenCalled();
  });

  it("on sign-in, uploads this device's plans and downloads the account's", async () => {
    const remoteOnly = { ...weddingPlan, id: "remote-plan" };
    vi.mocked(listRemotePlans).mockResolvedValue([remoteOnly]);
    saveLocalPlan(weddingPlan);
    await renderButton();

    auth.emit({ uid: "u1", displayName: "Ananya" });
    expect(await screen.findByText("Ananya")).toBeInTheDocument();
    await waitFor(() => expect(saveRemotePlan).toHaveBeenCalledWith("u1", weddingPlan));
    expect(saveRemotePlan).not.toHaveBeenCalledWith("u1", remoteOnly);
    expect(
      loadLocalPlans()
        .map((p) => p.id)
        .sort(),
    ).toEqual([weddingPlan.id, "remote-plan"].sort());
    await waitFor(() => expect(getSaveStatus()).toBe("saved"));
  });

  it("explains blocked pop-ups but stays quiet when the person closes the pop-up", async () => {
    const user = userEvent.setup();
    await renderButton();
    auth.emit(null);

    auth.signInWithPopup.mockRejectedValueOnce({ code: "auth/popup-closed-by-user" });
    await user.click(await screen.findByRole("button", { name: "Sign in with Google" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    auth.signInWithPopup.mockRejectedValueOnce({ code: "auth/popup-blocked" });
    await user.click(screen.getByRole("button", { name: "Sign in with Google" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Allow pop-ups/);
  });

  it("signs out", async () => {
    const user = userEvent.setup();
    await renderButton();
    auth.emit({ uid: "u1", displayName: "Ananya" });
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalled();
    auth.emit(null);
    await waitFor(() => expect(getSaveStatus()).toBe("device"));
  });
});
