import { describe, expect, it } from "vitest";
import manifest from "./manifest";
import robots from "./robots";
import sitemap from "./sitemap";

describe("site metadata routes", () => {
  it("keeps private plan pages and the API out of search engines", () => {
    const { rules, sitemap: map } = robots();
    expect(rules).toMatchObject({ allow: "/", disallow: ["/api/", "/plan/"] });
    expect(map).toMatch(/\/sitemap\.xml$/);
  });

  it("lists only the public landing page in the sitemap", () => {
    expect(sitemap().map((entry) => entry.url)).toHaveLength(1);
  });

  it("describes an installable app with both icons", () => {
    const app = manifest();
    expect(app).toMatchObject({ short_name: "UtsavOS", start_url: "/", display: "standalone" });
    expect(app.icons?.map((icon) => icon.src)).toEqual(["/icon.svg", "/apple-icon.png"]);
  });
});
