import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";
import NotFound from "./not-found";

describe("not-found page", () => {
  it("explains the missing page and offers a way back in", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/wandered off/);
    expect(screen.getByRole("link", { name: "Plan a celebration" })).toHaveAttribute(
      "href",
      "/plan/new",
    );
    expect(screen.getByRole("link", { name: "My plans" })).toHaveAttribute("href", "/plans");
  });
});

describe("error page", () => {
  it("logs the error, reassures that plans are saved, and retries", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const reset = vi.fn();
    const error = new Error("render failed");
    render(<ErrorPage error={error} reset={reset} />);

    expect(log).toHaveBeenCalledWith(error);
    expect(screen.getByText(/Your plans are saved/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalled();
    log.mockRestore();
  });
});
