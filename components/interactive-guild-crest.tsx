"use client";

import Image from "next/image";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import guildCrest from "@/public/images/logo-meguild.png";
import styles from "@/app/home.module.css";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function InteractiveGuildCrest() {
  const crestRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const updateMotionPreference = () => {
      reducedMotionRef.current = motionQuery.matches;
    };

    updateMotionPreference();
    motionQuery.addEventListener("change", updateMotionPreference);

    return () => {
      motionQuery.removeEventListener("change", updateMotionPreference);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  function setPose(x: number, y: number) {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    frameRef.current = requestAnimationFrame(() => {
      const crest = crestRef.current;
      if (!crest) return;

      crest.style.setProperty("--crest-x", `${x * 14}px`);
      crest.style.setProperty("--crest-y", `${y * 10}px`);
      crest.style.setProperty("--crest-rx", `${y * -3.5}deg`);
      crest.style.setProperty("--crest-ry", `${x * 5}deg`);
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || reducedMotionRef.current) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    setPose(x, y);
  }

  function handlePointerLeave() {
    setPose(0, 0);
  }

  return (
    <div
      className={styles.crestStage}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div ref={crestRef} className={styles.crestMotion}>
        <div className={styles.crestFloat}>
          <Image
            src={guildCrest}
            alt="ME GUILD — Adventurer's Guild"
            sizes="(max-width: 520px) 180px, (max-width: 900px) 280px, 380px"
            fetchPriority="low"
            placeholder="blur"
            draggable={false}
            className={styles.guildCrest}
          />
        </div>
      </div>
    </div>
  );
}
