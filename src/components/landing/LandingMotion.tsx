"use client";

import { useEffect } from "react";

/**
 * Progressive enhancement for the landing page: Lenis smooth scrolling and the scroll-scrubbed
 * sentence-to-brief scene. The markup already shows the finished state, so with reduced motion
 * (or before this loads) nothing is hidden.
 */
export function LandingMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({ lerp: 0.12 });
      lenis.on("scroll", () => ScrollTrigger.update());
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      const ctx = gsap.context(() => {
        const demo = document.querySelector<HTMLElement>("[data-demo]");
        if (!demo) return;
        const tokens = gsap.utils.toArray<HTMLElement>("[data-token]", demo);

        gsap.set(tokens, { "--hl": 0 });
        gsap.set("[data-field]", { autoAlpha: 0.15, y: 16 });

        const pinned = window.matchMedia("(min-width: 900px)").matches;
        const timeline = gsap.timeline({
          defaults: { ease: "power2.out", duration: 1 },
          scrollTrigger: {
            trigger: demo,
            start: pinned ? "top top" : "top 70%",
            end: pinned ? "+=140%" : "bottom 60%",
            scrub: 0.6,
            pin: pinned,
          },
        });
        tokens.forEach((token, i) => {
          timeline
            .to(token, { "--hl": 1 }, i)
            .to(`[data-field="${token.dataset.token ?? ""}"]`, { autoAlpha: 1, y: 0 }, i + 0.3);
        });
      });

      cleanup = () => {
        ctx.revert();
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    })();

    return () => cleanup?.();
  }, []);

  return null;
}
