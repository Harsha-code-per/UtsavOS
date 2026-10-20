import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthButton } from "./AuthButton";
import { useAuth } from "./AuthProvider";

vi.mock("./AuthProvider", () => ({ useAuth: vi.fn() }));
const signIn = vi.fn(() => Promise.resolve());
const signOut = vi.fn(() => Promise.resolve());
const auth = (value: Partial<ReturnType<typeof useAuth>>) => {
  vi.mocked(useAuth).mockReturnValue({
    status: "signedOut",
    user: null,
    error: null,
    signIn,
    signOut,
    ...value,
  });
};

beforeEach(() => {
  signIn.mockClear();
  signOut.mockClear();
});

describe("AuthButton", () => {
  it.each(["unavailable", "loading"] as const)("renders nothing while auth is %s", (status) => {
    auth({ status });
    const { container } = render(<AuthButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers Google sign-in when signed out", async () => {
    auth({});
    render(<AuthButton />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));
    expect(signIn).toHaveBeenCalled();
  });

  it("shows who is signed in and signs out", async () => {
    auth({ status: "signedIn", user: { uid: "u1", name: "Asha" } });
    render(<AuthButton />);
    expect(screen.getByText("Asha")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOut).toHaveBeenCalled();
  });

  it("alerts sign-in problems", () => {
    auth({ error: "The sign-in window was closed." });
    render(<AuthButton />);
    expect(screen.getByRole("alert")).toHaveTextContent("The sign-in window was closed.");
  });
});
