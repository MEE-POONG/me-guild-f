"use client";

import { useEffect, useState } from "react";
import type { RealLifeSkillGrade, RealLifeSkillSnapshot } from "@/lib/real-life-skills-types";

export type RealLifeSkillLoadState = { kind: "loading" } | { kind: "anonymous" } | { kind: "error"; message: string } | { kind: "ready"; snapshot: RealLifeSkillSnapshot };
const grades: RealLifeSkillGrade[] = ["SS", "S", "A", "B", "C", "D", "E", "F", "G"];
function isSnapshot(value: unknown): value is RealLifeSkillSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<RealLifeSkillSnapshot>;
  return row.maxLevel === 999 && typeof row.level === "number" && Number.isFinite(row.level)
    && typeof row.totalEarned === "number" && typeof row.totalPossible === "number" && typeof row.percent === "number"
    && grades.includes(row.grade as RealLifeSkillGrade) && Array.isArray(row.nodes) && Array.isArray(row.history)
    && Boolean(row.rules && Array.isArray(row.rules.thresholds));
}

/** One owned-member read per mounted view, with cancellation for retries/unmounts. */
export function useRealLifeSkills() {
  const [state, setState] = useState<RealLifeSkillLoadState>({ kind: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), 15_000);
    fetch("/api/adventure/skills", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) { if (!controller.signal.aborted) setState({ kind: "anonymous" }); return; }
        const result: unknown = await response.json();
        if (!response.ok || !isSnapshot(result)) throw new Error("UNAVAILABLE");
        if (!controller.signal.aborted) setState({ kind: "ready", snapshot: result });
      })
      .catch(() => { if (!controller.signal.aborted || controller.signal.reason === "timeout") setState({ kind: "error", message: "ยังเปิดบันทึกทักษะไม่ได้ กรุณาลองใหม่ภายหลัง" }); })
      .finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [requestVersion]);

  function refresh() { setState({ kind: "loading" }); setRequestVersion((value) => value + 1); }
  return { state, refresh };
}
