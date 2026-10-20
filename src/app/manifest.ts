import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UtsavOS: AI celebration planner",
    short_name: "UtsavOS",
    description:
      "Plan weddings, birthdays and community events with Gemini: budgets, timelines, vendor checklists and ideas.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F0D24",
    theme_color: "#0F0D24",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
