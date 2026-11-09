import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { canRender3D } from "./capabilities";

const Scene = lazy(() => import("./SignalPlanetScene"));

/** The pre-rendered planet with a CSS glow: reduced motion, low-power devices, and while 3D loads. */
export function StaticPlanet({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute left-1/2 top-[58%] h-[min(130vw,1100px)] w-[min(130vw,1100px)] -translate-x-1/2 rounded-full bg-flare/25 blur-[90px]" />
      <img
        src="/images/planet-static.webp"
        srcSet="/images/planet-static-800.webp 800w, /images/planet-static-1200.webp 1200w, /images/planet-static.webp 1600w"
        sizes="min(150vw, 1500px)"
        // The landing page's largest paint: fetch it first. Lower-case attribute: React 18 doesn't
        // know the camel-case prop yet and would warn.
        {...{ fetchpriority: "high" }}
        decoding="async"
        alt=""
        className="absolute bottom-0 left-1/2 w-[min(150vw,1500px)] max-w-none -translate-x-1/2 select-none"
        draggable={false}
      />
    </div>
  );
}

type Props = {
  className?: string;
  /** Play the noise → signal intro (landing page, first load only). */
  intro?: boolean;
  onIntroDone?: () => void;
};

/**
 * Chooses 3D or static, lazy-loads the scene, and pauses rendering when the tab is hidden or the
 * planet is scrolled out of view (keeps laptops cool and the main thread free).
 */
export function SignalPlanet({ className, intro = false, onIntroDone }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [use3D] = useState(canRender3D);
  // The static planet paints first (it is the LCP image); the 3D scene loads when the browser is
  // idle, so the 1 MB of three.js never competes with first paint.
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!use3D) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setIdle(true), { timeout: 2000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setIdle(true), 300);
    return () => clearTimeout(t);
  }, [use3D]);
  const [visible, setVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState !== "hidden");

  useEffect(() => {
    if (!use3D) onIntroDone?.(); // nothing to wait for
  }, [use3D, onIntroDone]);

  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    const el = host.current;
    const observer =
      el && "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)))
        : null;
    if (el && observer) observer.observe(el);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={host} aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      {use3D && idle ? (
        <Suspense fallback={<StaticPlanet />}>
          <Scene intro={intro} onIntroDone={onIntroDone} paused={!visible || !tabVisible} />
        </Suspense>
      ) : (
        <StaticPlanet />
      )}
    </div>
  );
}
