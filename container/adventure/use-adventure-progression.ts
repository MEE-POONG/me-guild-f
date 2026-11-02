"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildCommunityProgressionSnapshot, COMMUNITY_PROGRESSION_RULE_VERSION, COMMUNITY_MAX_LEVEL, COMMUNITY_RANKS, progressionLevelThreshold, type CommunityProgressionCredit, type CommunityProgressionSnapshot } from "@/lib/adventure-progression";

export type ProgressionMode = "demo" | "member";
type ProgressionStatus = "demo" | "loading" | "ready" | "anonymous" | "error";
type DemoStage = "initial" | "participation" | "staff";
const demoCredits: CommunityProgressionCredit[] = [
  { campaignId: "demo-campfire", campaignTitle: "ค่ำคืนข้างกองไฟ · ตัวอย่าง", xp: 150, source: "staff", earnedAt: "2026-10-21T19:00:00+07:00" },
  { campaignId: "demo-library", campaignTitle: "ห้องสมุดนักเดินทาง · ตัวอย่าง", xp: 150, source: "staff", earnedAt: "2026-10-22T19:00:00+07:00" },
  { campaignId: "demo-map", campaignTitle: "บันทึกแผนที่ร่วมทาง · ตัวอย่าง", xp: 150, source: "staff", earnedAt: "2026-10-23T19:00:00+07:00" },
  { campaignId: "demo-build", campaignTitle: "สร้างเมืองกับสหาย · ตัวอย่าง", xp: 150, source: "staff", earnedAt: "2026-10-24T19:00:00+07:00" },
  { campaignId: "demo-moon", campaignTitle: "ทริปใต้แสงจันทร์ · ตัวอย่าง", xp: 50, source: "participation", earnedAt: "2026-10-25T19:00:00+07:00" },
];

function previewSnapshot(stage: DemoStage) {
  const extra: CommunityProgressionCredit[] = stage === "initial" ? [] : [{ campaignId: "demo-next-chapter", campaignTitle: "เรื่องราวบทใหม่ · กิจกรรมทดลอง", xp: stage === "staff" ? 150 : 50, source: stage === "staff" ? "staff" : "participation", earnedAt: "2026-10-27T14:00:00+07:00" }];
  return buildCommunityProgressionSnapshot({ credits: [...demoCredits, ...extra], earnedAchievements: 5 + (stage === "initial" ? 0 : stage === "staff" ? 2 : 1) });
}

function validSnapshot(value: unknown): value is CommunityProgressionSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as CommunityProgressionSnapshot;
  const nonnegativeInteger = (entry: unknown): entry is number => typeof entry === "number" && Number.isSafeInteger(entry) && entry >= 0;
  if (snapshot.ruleVersion !== COMMUNITY_PROGRESSION_RULE_VERSION || !nonnegativeInteger(snapshot.totalXp) || !nonnegativeInteger(snapshot.level) || snapshot.level < 1 || snapshot.level > COMMUNITY_MAX_LEVEL) return false;
  const maxLevel = snapshot.level === COMMUNITY_MAX_LEVEL;
  const start = progressionLevelThreshold(snapshot.level);
  const next = maxLevel ? null : progressionLevelThreshold(snapshot.level + 1);
  const cost = next === null ? null : next - start;
  const remaining = next === null ? 0 : next - snapshot.totalXp;
  const progress = cost === null ? 100 : Math.min(100, Math.max(0, Math.round((snapshot.totalXp - start) / cost * 10000) / 100));
  if (snapshot.isMaxLevel !== maxLevel || snapshot.levelStartXp !== start || snapshot.nextLevelXp !== next || snapshot.xpForNextLevel !== cost || !nonnegativeInteger(snapshot.xpIntoLevel) || snapshot.xpIntoLevel !== snapshot.totalXp - start || !nonnegativeInteger(snapshot.xpRemaining) || snapshot.xpRemaining !== remaining || !Number.isFinite(snapshot.progressPercent) || snapshot.progressPercent !== progress || (!maxLevel && remaining <= 0)) return false;
  const rank = [...COMMUNITY_RANKS].reverse().find((entry) => entry.level <= snapshot.level);
  if (!snapshot.rank || typeof snapshot.rank !== "object" || snapshot.rank.level !== rank?.level || snapshot.rank.title !== rank?.title) return false;
  if (!snapshot.metrics || typeof snapshot.metrics !== "object" || !nonnegativeInteger(snapshot.metrics.participatedEvents) || !nonnegativeInteger(snapshot.metrics.approvedEvents) || !nonnegativeInteger(snapshot.metrics.earnedAchievements) || snapshot.metrics.approvedEvents > snapshot.metrics.participatedEvents || snapshot.metrics.earnedAchievements < snapshot.metrics.participatedEvents || snapshot.totalXp !== snapshot.metrics.participatedEvents * 50 + snapshot.metrics.approvedEvents * 100) return false;
  if (!Array.isArray(snapshot.milestones) || snapshot.milestones.length !== COMMUNITY_RANKS.length || !snapshot.milestones.every((milestone, index) => milestone && typeof milestone === "object" && milestone.level === COMMUNITY_RANKS[index].level && milestone.title === COMMUNITY_RANKS[index].title && milestone.totalXp === progressionLevelThreshold(milestone.level) && milestone.reached === (snapshot.level >= milestone.level))) return false;
  if (!Array.isArray(snapshot.recentCredits) || snapshot.recentCredits.length !== Math.min(8, snapshot.metrics.participatedEvents)) return false;
  const campaignIds = new Set<string>();
  return snapshot.recentCredits.every((credit) => {
    if (!credit || typeof credit !== "object" || typeof credit.campaignId !== "string" || !credit.campaignId || credit.campaignId.length > 128 || campaignIds.has(credit.campaignId) || typeof credit.campaignTitle !== "string" || !credit.campaignTitle.trim() || credit.campaignTitle.length > 240 || typeof credit.earnedAt !== "string" || credit.earnedAt.length > 64 || !Number.isFinite(Date.parse(credit.earnedAt)) || (credit.source !== "participation" && credit.source !== "staff") || credit.xp !== (credit.source === "staff" ? 150 : 50)) return false;
    campaignIds.add(credit.campaignId);
    return true;
  });
}

async function readProgression(signal: AbortSignal): Promise<{ status: "ready"; snapshot: CommunityProgressionSnapshot } | { status: "anonymous" | "error"; snapshot: null }> {
  const response = await fetch("/api/adventure/progression", { cache: "no-store", credentials: "same-origin", signal });
  if (response.status === 401) return { status: "anonymous", snapshot: null };
  if (!response.ok) return { status: "error", snapshot: null };
  const snapshot: unknown = await response.json();
  if (!validSnapshot(snapshot)) throw new Error("progression-shape");
  return { status: "ready", snapshot };
}

export function useAdventureProgression(initialMode: ProgressionMode = "demo", memberAuthError: string | null = null) {
  const [mode, setMode] = useState<ProgressionMode>(initialMode);
  const [status, setStatus] = useState<ProgressionStatus>(initialMode === "member" ? "loading" : "demo");
  const [memberSnapshot, setMemberSnapshot] = useState<CommunityProgressionSnapshot | null>(null);
  const [demoStage, setDemoStage] = useState<DemoStage>("initial");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(memberAuthError ?? "");
  const [signingIn, setSigningIn] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const snapshot = mode === "demo" ? previewSnapshot(demoStage) : memberSnapshot;

  const settle = useCallback((result: Awaited<ReturnType<typeof readProgression>>) => {
    setStatus(result.status); setMemberSnapshot(result.snapshot);
    if (result.status === "error") setError("ยังอ่านบันทึกการเติบโตไม่ได้ ลองใหม่เมื่อบริการพร้อม");
  }, []);

  useEffect(() => {
    if (initialMode !== "member") return;
    const controller = new AbortController();
    controllerRef.current = controller;
    readProgression(controller.signal).then((result) => { if (!controller.signal.aborted) settle(result); }).catch(() => { if (!controller.signal.aborted) settle({ status: "error", snapshot: null }); });
    return () => controller.abort();
  }, [initialMode, settle]);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const loadMember = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setMode("member"); setStatus("loading"); setMemberSnapshot(null); setError(""); setNotice("");
    try {
      const result = await readProgression(controller.signal);
      if (!controller.signal.aborted) {
        settle(result);
        if (result.status === "ready" && memberSnapshot && result.snapshot.level > memberSnapshot.level) setNotice(`เลื่อนเป็น LV. ${result.snapshot.level} · ${result.snapshot.rank.title}`);
      }
    }
    catch { if (!controller.signal.aborted) settle({ status: "error", snapshot: null }); }
  }, [settle, memberSnapshot]);

  const refreshMember = useCallback(async () => { if (mode === "member") await loadMember(); }, [mode, loadMember]);
  const clearMember = () => { controllerRef.current?.abort(); setMode("member"); setStatus("anonymous"); setMemberSnapshot(null); setError(""); setNotice(""); setSigningIn(false); };
  const showDemo = () => { controllerRef.current?.abort(); setMode("demo"); setStatus("demo"); setMemberSnapshot(null); setError(""); setNotice(""); setSigningIn(false); };
  const confirmDemoParticipation = () => {
    if (mode !== "demo" || demoStage !== "initial") return;
    setDemoStage("participation");
    const next = previewSnapshot("participation");
    setNotice(`ตัวอย่าง: ยืนยันกิจกรรมใหม่ +50 EXP · เลื่อนเป็น LV. ${next.level} และฉายา ${next.rank.title}`);
  };
  const approveDemoWork = () => {
    if (mode !== "demo" || demoStage !== "participation") return;
    setDemoStage("staff");
    setNotice("ตัวอย่าง: ทีมงานรับรองกิจกรรมเดิม เพิ่มเฉพาะส่วนต่าง +100 EXP · กิจกรรมนี้รวม 150 EXP แล้ว");
  };
  const signInMember = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setSigningIn(true); setError("");
    try {
      const csrfResponse = await fetch("/api/adventure/member-auth/csrf", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
      const csrf = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("csrf");
      const response = await fetch("/api/adventure/member-auth/signin/discord", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: `${window.location.origin}/adventure?panel=status&progression=member`, json: "true" }), signal: controller.signal });
      const payload = await response.json() as { url?: string };
      if (!response.ok || !payload.url) throw new Error("signin");
      const destination = new URL(payload.url, window.location.origin);
      if (destination.origin !== window.location.origin && destination.origin !== "https://discord.com") throw new Error("redirect");
      if (!controller.signal.aborted) window.location.assign(destination.toString());
    } catch { if (!controller.signal.aborted) { setError("ยังเริ่มเข้าสู่ระบบสมาชิกไม่ได้ กรุณาลองใหม่เมื่อบริการพร้อม"); setSigningIn(false); } }
  };

  return { mode, status, snapshot, demoStage, demoStartXp: previewSnapshot("initial").totalXp, notice, error, signingIn, loadMember, refreshMember, clearMember, showDemo, confirmDemoParticipation, approveDemoWork, signInMember };
}

export type AdventureProgressionState = ReturnType<typeof useAdventureProgression>;
