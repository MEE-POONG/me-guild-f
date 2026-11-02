"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { animate, createScope } from "animejs";
import Tilt from "react-parallax-tilt";

const motionQuery = "(prefers-reduced-motion: reduce)";
const finePointerQuery = "(hover: hover) and (pointer: fine)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function subscribePointer(callback: () => void) {
  const media = window.matchMedia(finePointerQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const reducedSnapshot = () => window.matchMedia(motionQuery).matches;
const pointerSnapshot = () => window.matchMedia(finePointerQuery).matches;
const reducedServerSnapshot = () => true;
const pointerServerSnapshot = () => false;

export function Motion({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(subscribeMotion, reducedSnapshot, reducedServerSnapshot);

  useEffect(() => {
    if (reduced || !root.current || !("IntersectionObserver" in window)) return;
    const scope = createScope({ root });
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // Content stays visible before hydration and when JavaScript is unavailable.
        scope.add(() => { animate(entry.target, { opacity: [0.35, 1], y: [18, 0], duration: 650, ease: "outCubic" }); });
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    root.current.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    return () => { observer.disconnect(); scope.revert(); };
  }, [reduced]);

  return <div ref={root} className={className} data-motion={reduced ? "off" : "on"}>{children}</div>;
}

export function GuildTilt({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useSyncExternalStore(subscribeMotion, reducedSnapshot, reducedServerSnapshot);
  const finePointer = useSyncExternalStore(subscribePointer, pointerSnapshot, pointerServerSnapshot);
  return <Tilt className={className} tiltEnable={!reduced && finePointer} tiltMaxAngleX={3} tiltMaxAngleY={3} perspective={1400} transitionSpeed={650} gyroscope={false} glareEnable={false}>{children}</Tilt>;
}
