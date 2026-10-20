// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

const run = () => proxy(new NextRequest("http://localhost/plan/new"));
const nonceOf = (csp: string | null) => /'nonce-([^']+)'/.exec(csp ?? "")?.[1];

describe("proxy", () => {
  it("sends a CSP with a fresh nonce on every page response", () => {
    const first = nonceOf(run().headers.get("content-security-policy"));
    const second = nonceOf(run().headers.get("content-security-policy"));
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
  });

  it("passes the same nonce to the page renderer so inline scripts can carry it", () => {
    const res = run();
    const nonce = nonceOf(res.headers.get("content-security-policy"));
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
  });

  it("skips API routes, static assets and prefetches", () => {
    const [matcher] = config.matcher;
    const pattern = new RegExp(`^${matcher?.source ?? ""}$`);
    expect(pattern.test("/plan/new")).toBe(true);
    expect(pattern.test("/api/plan")).toBe(false);
    expect(pattern.test("/_next/static/chunk.js")).toBe(false);
    expect(matcher?.missing.map((m) => m.key)).toEqual(["next-router-prefetch", "purpose"]);
  });
});
