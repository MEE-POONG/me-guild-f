"use client";

import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Tilt from "react-parallax-tilt";
import { animate } from "animejs";
import { GiCheckMark, GiCompass, GiCrown, GiLaurels, GiOpenBook, GiPadlock, GiPresent, GiRoundStar, GiSettingsKnobs, GiTicket } from "react-icons/gi";
import type { RaffleStageData } from "@/lib/raffle-stage-policy";
import styles from "./raffle-stage.module.css";

const GaraponThree = dynamic(() => import("./garapon-three").then((module) => module.GaraponThree), { ssr: false, loading: () => null });

class GaraponSceneBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onUnavailable(); }
  render() { return this.state.failed ? null : this.props.children; }
}

type Props = { campaignId: string; mode: "control" | "stage"; demo?: boolean };
type Resource = { kind: "ready"; data: RaffleStageData } | { kind: "anonymous" | "forbidden" } | { kind: "error"; message: string };
const phases = { DRAFT: "ฉบับร่าง · รอเปิดกิจกรรม", OPEN: "กำลังรับตั๋วเข้าร่วมกิจกรรม", LOCKED: "ปิดรับตั๋วแล้ว · รอประมวลผล", DRAWING: "กำลังจัดเตรียมผลจากระบบ", READY: "ผลพร้อมสำหรับเปิดบนเวที", COMPLETE: "เผยรายชื่อครบแล้ว", INVALIDATED: "ข้อมูลรอบเปลี่ยน กรุณาตรวจหลังบ้าน" };
const prizeKinds = { ROLE: "ยศ Discord", ITEM: "ไอเทม", BADGE: "ตราสัญลักษณ์" };
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max; }
function safeText(value: unknown, max = 180): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= max && !/\b\d{17,20}\b/.test(value) && !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value); }
function prize(value: unknown): boolean { return record(value) && integer(value.slot, 19) && safeText(value.label) && typeof value.kind === "string" && Object.hasOwn(prizeKinds, value.kind) && integer(value.quantity, 99) && value.quantity >= 1; }
function parseStage(value: unknown, campaignId: string): RaffleStageData {
  if (!record(value) || value.campaignId !== campaignId || !safeText(value.title) || typeof value.phase !== "string" || !Object.hasOwn(phases, value.phase) || typeof value.revision !== "string" || !Number.isFinite(Date.parse(value.revision)) || typeof value.prepared !== "boolean" || !integer(value.revealedCount, 20) || !integer(value.totalWinners, 20) || !integer(value.plannedWinnerCount, 20) || value.revealedCount > value.totalWinners || value.totalWinners > value.plannedWinnerCount || !integer(value.entryCount) || !integer(value.participantCount) || !Array.isArray(value.prizes) || !Array.isArray(value.revealedWinners) || !Array.isArray(value.entries) || !record(value.entryPagination)) throw new Error("ข้อมูลเวทียังไม่สมบูรณ์ กรุณาตรวจหลังบ้านแล้วโหลดใหม่");
  if (value.prizes.length > 20 || value.prizes.some((item) => !prize(item) || !["CLOSED", "REVEALED", "UNFILLED"].includes(String(item.state))) || (value.nextPrize !== null && !prize(value.nextPrize)) || value.revealedWinners.length !== value.revealedCount || value.revealedWinners.some((winner) => !record(winner) || !integer(winner.slot, 19) || !safeText(winner.displayName, 120) || !safeText(winner.entryLabel, 80) || !safeText(winner.prizeLabel) || typeof winner.kind !== "string" || !Object.hasOwn(prizeKinds, winner.kind) || !integer(winner.quantity, 99) || winner.quantity < 1) || value.entries.length > 50 || value.entries.some((entry) => !record(entry) || !safeText(entry.code, 80) || !safeText(entry.displayName, 120) || !integer(entry.ticketCount) || entry.ticketCount < 1)) throw new Error("ข้อมูลรายชื่อหรือรางวัลยังไม่พร้อมให้แสดง");
  const pagination = value.entryPagination;
  if (!integer(pagination.page, 100) || pagination.page < 1 || !integer(pagination.pageSize, 50) || pagination.pageSize < 1 || !integer(pagination.totalParticipants) || typeof pagination.hasMore !== "boolean" || new Set(value.revealedWinners.map((winner) => winner.slot)).size !== value.revealedWinners.length) throw new Error("ข้อมูลหน้าเวทียังไม่สมบูรณ์");
  return value as RaffleStageData;
}
function subscribeMotion(listener: () => void) { const media = window.matchMedia("(prefers-reduced-motion: reduce)"); media.addEventListener("change", listener); return () => media.removeEventListener("change", listener); }
function subscribeFullscreen(listener: () => void) { document.addEventListener("fullscreenchange", listener); return () => document.removeEventListener("fullscreenchange", listener); }
function PrizeIcon({ kind }: { kind: RaffleStageData["prizes"][number]["kind"] }) { return kind === "ROLE" ? <GiCrown aria-hidden="true" /> : kind === "BADGE" ? <GiLaurels aria-hidden="true" /> : <GiPresent aria-hidden="true" />; }
const count = (value: number) => value.toLocaleString("th-TH");
function demoSnapshot(campaignId: string, revealedCount = 0, prepared = false): RaffleStageData {
  const displayNames = ["นักผจญภัยใบชา", "สหายแมวส้ม", "นักอ่านใต้แสงดาว", "ผู้สร้างบ้านไม้", "คนเก็บสมุนไพร"];
  const labels = ["กล่องเสบียงตัวอย่าง", "ตราสหายตัวอย่าง", "ตำรานักเดินทางตัวอย่าง", "ถุงสมุนไพรตัวอย่าง", "ดาวแห่งกิลด์ตัวอย่าง"];
  const quantities = [3, 1, 2, 5, 1], tickets = [3, 5, 2, 4, 3];
  const prizes: RaffleStageData["prizes"] = labels.map((label, slot) => ({ slot, label, kind: slot === 1 || slot === 4 ? "BADGE" : "ITEM", quantity: quantities[slot], state: slot < revealedCount ? "REVEALED" : "CLOSED" }));
  const entries = displayNames.map((displayName, index) => ({ code: `DEMO-${String(index + 1).padStart(3, "0")}`, displayName: `${displayName} · สมมติ`, ticketCount: tickets[index] }));
  return parseStage({ campaignId, title: "เทศกาลสหายแห่ง Me Guild · ตัวอย่าง", phase: prepared && revealedCount === 5 ? "COMPLETE" : "READY", revision: new Date(Date.UTC(2026, 9, 28, 0, 0, prepared ? revealedCount + 1 : 0)).toISOString(), prepared, revealedCount, totalWinners: 5, plannedWinnerCount: 5, entryCount: 17, participantCount: 5, prizes, nextPrize: prepared && revealedCount < 5 ? { slot: revealedCount, label: labels[revealedCount], kind: prizes[revealedCount].kind, quantity: quantities[revealedCount] } : null, revealedWinners: prizes.slice(0, revealedCount).map((item) => ({ slot: item.slot, displayName: entries[item.slot].displayName, entryLabel: entries[item.slot].code, prizeLabel: item.label, kind: item.kind, quantity: item.quantity })), entries, entryPagination: { page: 1, pageSize: 50, totalParticipants: 5, hasMore: false } }, campaignId);
}

export function RaffleStage(props: Props) { return <StageSession key={`${props.campaignId}:${props.demo ? "demo" : "live"}`} {...props} />; }

function StageSession({ campaignId, mode, demo = false }: Props) {
  const [resource, setResource] = useState<Resource | null>(() => demo ? { kind: "ready", data: demoSnapshot(campaignId) } : null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState<"prepare" | "next" | null>(null);
  const [actionError, setActionError] = useState("");
  const [animatingSlot, setAnimatingSlot] = useState<number | null>(null);
  const [threeStatus, setThreeStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const [toolsVisible, setToolsVisible] = useState(true);
  const [toolNotice, setToolNotice] = useState("");
  const systemReducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const reducedMotion = motionOverride ?? systemReducedMotion;
  const fullscreen = useSyncExternalStore(subscribeFullscreen, () => document.fullscreenElement !== null, () => false);
  const motion = !reducedMotion;
  const motionRef = useRef(motion);
  useEffect(() => { motionRef.current = motion; }, [motion]);
  const latest = useRef<RaffleStageData | null>(resource?.kind === "ready" ? resource.data : null);
  const highWater = useRef<{ revision: number; count: number } | null>(null);
  const mounted = useRef(false);
  const readController = useRef<AbortController | null>(null);
  const writeController = useRef<AbortController | null>(null);
  const mutating = useRef(false);
  const readSequence = useRef(0);
  const frame = useRef<HTMLElement>(null);
  const drum = useRef<SVGGElement>(null);
  const crank = useRef<SVGGElement>(null);
  const ball = useRef<HTMLDivElement>(null);
  const heldSlot = useRef<number | null>(null);
  const data = resource?.kind === "ready" ? resource.data : null;
  const invalidated = data?.phase === "INVALIDATED";
  const namesVisible = !!data && !invalidated;
  const currentWinner = namesVisible && animatingSlot === null ? data.revealedWinners.at(-1) ?? null : null;
  const visibleWinners = namesVisible ? data.revealedWinners.filter((winner) => winner.slot !== animatingSlot) : [];
  const waiting = data && !["READY", "COMPLETE", "INVALIDATED"].includes(data.phase);
  const canPrepare = !!data && data.phase === "READY" && !data.prepared;
  const canNext = !!data && data.prepared && data.phase === "READY" && data.revealedCount < data.totalWinners;
  const sceneReady = useCallback(() => { if (mounted.current) setThreeStatus((current) => current === "unavailable" ? current : "ready"); }, []);
  const sceneUnavailable = useCallback(() => { if (mounted.current) setThreeStatus("unavailable"); }, []);

  const accept = useCallback((next: RaffleStageData) => {
    const revision = Date.parse(next.revision), watermark = highWater.current;
    if (next.phase !== "INVALIDATED" && watermark) {
      if (revision < watermark.revision) return;
      if (next.revealedCount < watermark.count) { latest.current = null; heldSlot.current = null; setAnimatingSlot(null); setResource({ kind: "error", message: "ลำดับผลกิจกรรมเปลี่ยน กรุณาตรวจหลังบ้านก่อนแสดงรายชื่อต่อ" }); return; }
    }
    if (next.phase !== "INVALIDATED") highWater.current = { revision, count: next.revealedCount };
    const previous = latest.current;
    if (!previous || previous.phase === "INVALIDATED") setThreeStatus((current) => current === "unavailable" ? current : "loading");
    const newWinner = next.revealedWinners.at(-1);
    const shouldAnimate = previous?.campaignId === next.campaignId && next.revealedCount > previous.revealedCount && newWinner && next.phase !== "INVALIDATED" && motionRef.current;
    latest.current = next; setResource({ kind: "ready", data: next }); setPage(next.entryPagination.page);
    if (next.phase === "INVALIDATED" || !previous || next.revealedCount < previous.revealedCount) { heldSlot.current = null; setAnimatingSlot(null); }
    else if (shouldAnimate) { heldSlot.current = newWinner.slot; setAnimatingSlot(newWinner.slot); }
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; writeController.current?.abort(); }; }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => { if (media.matches && motionOverride === null) { heldSlot.current = null; setAnimatingSlot(null); } };
    media.addEventListener("change", changed); return () => media.removeEventListener("change", changed);
  }, [motionOverride]);
  useEffect(() => {
    if (demo) return;
    let disposed = false;
    let timer: number | undefined;
    let inFlight: AbortController | null = null;
    const schedule = () => { window.clearTimeout(timer); if (!disposed && (mode === "stage" || !document.hidden)) timer = window.setTimeout(() => { void load(); }, 4_000); };
    const load = async () => {
      if (disposed || (mode === "control" && document.hidden)) return;
      if (mutating.current) { schedule(); return; }
      const sequence = ++readSequence.current;
      const controller = new AbortController(); inFlight = controller; readController.current = controller;
      const timeout = window.setTimeout(() => {
        if (disposed || controller.signal.aborted || sequence !== readSequence.current) return;
        controller.abort(); latest.current = null; heldSlot.current = null; setAnimatingSlot(null); setResource({ kind: "error", message: "การเชื่อมต่อใช้เวลานาน กรุณาลองโหลดเวทีใหม่" });
      }, 12_000);
      try {
        const response = await fetch(`/api/raffles/${encodeURIComponent(campaignId)}/stage?${new URLSearchParams({ page: String(page) })}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const payload: unknown = await response.json().catch(() => null);
        if (disposed || controller.signal.aborted || sequence !== readSequence.current) return;
        if (response.status === 401 || response.status === 403) { latest.current = null; heldSlot.current = null; setAnimatingSlot(null); setResource({ kind: response.status === 401 ? "anonymous" : "forbidden" }); return; }
        if (!response.ok) throw new Error(record(payload) && typeof payload.error === "string" ? payload.error : "ยังโหลดเวทีไม่ได้ กรุณาลองใหม่เมื่อบริการพร้อม");
        accept(parseStage(payload, campaignId));
      } catch (failure) {
        if (!disposed && !controller.signal.aborted && sequence === readSequence.current) { latest.current = null; heldSlot.current = null; setAnimatingSlot(null); setResource({ kind: "error", message: failure instanceof Error ? failure.message : "โหลดเวทีไม่สำเร็จ" }); }
      } finally { window.clearTimeout(timeout); if (inFlight === controller) inFlight = null; if (sequence === readSequence.current) schedule(); }
    };
    const visibility = () => { window.clearTimeout(timer); if (document.hidden) { inFlight?.abort(); ++readSequence.current; } else if (!inFlight || inFlight.signal.aborted) void load(); };
    if (mode === "control") document.addEventListener("visibilitychange", visibility);
    void load();
    return () => { disposed = true; window.clearTimeout(timer); inFlight?.abort(); if (mode === "control") document.removeEventListener("visibilitychange", visibility); };
  }, [campaignId, page, refresh, accept, demo, mode]);
  useEffect(() => {
    if (animatingSlot === null) return;
    const slot = animatingSlot;
    const finish = () => { if (mounted.current && heldSlot.current === slot) { heldSlot.current = null; setAnimatingSlot(null); } };
    if (!motion) { finish(); return; }
    // Result timing belongs to the stage, even when the canvas cannot load or loses its context.
    const timer = window.setTimeout(finish, 1_900);
    return () => window.clearTimeout(timer);
  }, [animatingSlot, motion]);
  useEffect(() => {
    if (animatingSlot === null || !motion || threeStatus === "ready" || !drum.current || !crank.current || !ball.current) return;
    const animations = [
      animate(drum.current, { rotate: [0, 720], duration: 1_200, ease: "inOut(3)" }),
      animate(crank.current, { rotate: [0, 1_080], duration: 1_200, ease: "inOut(3)" }),
      animate(ball.current, { translateY: [-140, 0], scale: [0.12, 1], opacity: [0, 1], delay: 1_150, duration: 750, ease: "out(3)" }),
    ];
    return () => animations.forEach((animation) => animation.revert());
  }, [animatingSlot, motion, threeStatus]);

  const changePresentation = async (action: "prepare" | "next") => {
    const current = latest.current;
    if (mode !== "control" || !current || mutating.current || heldSlot.current !== null || current.phase === "INVALIDATED") return;
    if (demo) {
      if ((action === "prepare" && current.prepared) || (action === "next" && (!current.prepared || current.revealedCount >= current.totalWinners))) return;
      accept(demoSnapshot(campaignId, action === "next" ? current.revealedCount + 1 : 0, true)); setActionError(""); return;
    }
    mutating.current = true; ++readSequence.current; readController.current?.abort(); setPending(action); setActionError("");
    const controller = new AbortController(); writeController.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 12_000);
    try {
      const response = await fetch(`/api/raffles/${encodeURIComponent(campaignId)}/stage`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ action, revision: current.revision, expectedRevealedCount: current.revealedCount }) });
      const payload: unknown = await response.json().catch(() => null);
      if (!mounted.current || (controller.signal.aborted && !timedOut)) return;
      if (response.status === 401 || response.status === 403) { latest.current = null; heldSlot.current = null; setAnimatingSlot(null); setResource({ kind: response.status === 401 ? "anonymous" : "forbidden" }); return; }
      if (!response.ok) {
        if (record(payload) && ["STAGE_SOURCE_INVALID", "STAGE_NOT_READY"].includes(String(payload.code))) { latest.current = null; heldSlot.current = null; setAnimatingSlot(null); setResource({ kind: "error", message: "ข้อมูลรอบเปลี่ยน กรุณาตรวจหลังบ้าน" }); }
        throw new Error(response.status === 409 ? "สถานะเวทีเปลี่ยนแล้ว กำลังโหลดลำดับล่าสุด กรุณาตรวจอีกครั้ง" : record(payload) && typeof payload.error === "string" ? payload.error : "ยังเปลี่ยนลำดับการเปิดผลไม่ได้ กำลังตรวจสถานะล่าสุด");
      }
      const next = parseStage(payload, campaignId); accept(next); setPage(next.entryPagination.page);
    } catch (failure) {
      if (mounted.current && (!controller.signal.aborted || timedOut)) setActionError(timedOut ? "ยังยืนยันการเปิดผลไม่ได้ กำลังตรวจลำดับล่าสุด กรุณารอข้อมูลก่อนกดอีกครั้ง" : failure instanceof Error ? failure.message : "ยังเปลี่ยนลำดับไม่ได้ กรุณาตรวจสถานะล่าสุด");
    } finally { window.clearTimeout(timeout); if (mounted.current) { mutating.current = false; setPending(null); setRefresh((value) => value + 1); } }
  };
  const chooseReducedMotion = (reduced: boolean) => { if (reduced) { heldSlot.current = null; setAnimatingSlot(null); } setMotionOverride(reduced); };
  const resetDemo = () => { if (!demo) return; highWater.current = null; heldSlot.current = null; latest.current = null; setAnimatingSlot(null); setPage(1); setActionError(""); accept(demoSnapshot(campaignId)); };
  const toggleFullscreen = async () => {
    setToolNotice("");
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if (frame.current?.requestFullscreen) await frame.current.requestFullscreen(); else setToolNotice("เบราว์เซอร์นี้ยังไม่รองรับโหมดเต็มจอ"); }
    catch { setToolNotice("เปิดเต็มจอไม่ได้ กรุณาลองจากปุ่มอีกครั้ง หรือใช้โหมดเต็มจอของเบราว์เซอร์"); }
  };

  return <div className={`${styles.workspace} ${mode === "stage" ? styles.clean : ""} ${demo ? styles.demo : ""}`}>
    {mode === "control" && <header className={styles.controlHeading}><div><p>ME GUILD · PRESENTATION CONTROL</p><h1>{demo ? "ทดลองเครื่องหมุนตั๋วนำโชค" : "ห้องควบคุมเวทีตั๋วนำโชค"}</h1><span>{demo ? "ทดลองเปิดรายชื่อสมมติ 5 คนตามลำดับ เพื่อดูบรรยากาศของเวที" : "เปิดเผยผู้โชคดีจากผลที่ระบบบันทึกไว้แล้ว ตามลำดับบนเวที"}</span></div><div><Link href={demo ? "/adventure?community=rewards#community" : "/operations/raffles"}>{demo ? "‹ กลับหอชุมชน" : "‹ กลับจัดการกิจกรรม"}</Link>{demo ? <span className={styles.demoLinkNotice}>ใช้ปุ่มเต็มจอของตัวอย่างนี้สำหรับแชร์จอ</span> : <Link href={`/adventure/raffles/stage/${campaignId}`} target="_blank" rel="noopener noreferrer">เปิดหน้าสำหรับแชร์จอ ↗</Link>}</div></header>}
    {mode === "control" && <section className={styles.controls} aria-label="ควบคุมลำดับการเปิดผล"><div><GiSettingsKnobs aria-hidden="true" /><div><strong>{data ? phases[data.phase] : "กำลังตรวจสถานะเวที…"}</strong><p>{data ? `${count(data.revealedCount)} / ${count(data.totalWinners)} ผู้โชคดีที่เผยแล้ว` : "รอข้อมูลจากระบบ"}</p></div></div><div>{demo ? <button type="button" className={styles.secondary} onClick={resetDemo}>เริ่มตัวอย่างใหม่</button> : <button type="button" className={styles.secondary} disabled={!!pending} onClick={() => setRefresh((value) => value + 1)}>โหลดสถานะล่าสุด</button>}{canPrepare && <button type="button" className={styles.primary} disabled={!!pending} onClick={() => void changePresentation("prepare")}>{pending === "prepare" ? "กำลังเตรียมเวที…" : "เตรียมเครื่องหมุน"}</button>}{data?.prepared && <button type="button" className={styles.primary} disabled={!canNext || !!pending || animatingSlot !== null} onClick={() => void changePresentation("next")}>{pending === "next" ? "กำลังเปิดผล…" : data.phase === "COMPLETE" ? "เผยครบแล้ว" : "หมุนและเผยผู้โชคดีถัดไป"}</button>}</div>{actionError && <p className={styles.actionError} role="alert">{actionError}</p>}{!demo && <p className={styles.controlHint}>เปิดหน้าเวทีแยกหน้าต่าง แล้วแชร์เฉพาะหน้าเวที ผู้จัดสามารถกลับมาควบคุมลำดับจากหน้านี้ได้</p>}{waiting && <p className={styles.controlHint}>เตรียมผลกิจกรรมให้พร้อมจากหลังบ้านก่อนเปิดเครื่องหมุน หน้านี้ใช้แสดงผลที่บันทึกแล้ว</p>}</section>}
    <section ref={frame} className={styles.stageFrame} aria-label="เวทีเครื่องหมุนตั๋วนำโชค">
      {demo && <div className={styles.demoBanner}><GiRoundStar aria-hidden="true" /><strong>โหมดตัวอย่าง · รายชื่อสมมติ · ไม่ใช้ตั๋วจริง</strong><span>เปิดตามลำดับตัวอย่าง · ไม่มีการจับรางวัลจริง</span></div>}
      <div className={styles.stageTools}>{toolsVisible ? <>{demo && mode === "control" && data && <button type="button" className={styles.stageAction} disabled={!!pending || animatingSlot !== null || (!canPrepare && !canNext)} onClick={() => void changePresentation(canPrepare ? "prepare" : "next")}>{canPrepare ? "เตรียมเครื่องตัวอย่าง" : animatingSlot !== null ? "กำลังหมุน…" : data.phase === "COMPLETE" ? "เผยครบแล้ว · ตัวอย่าง" : "หมุนคนถัดไป · ตัวอย่าง"}</button>}<button type="button" onClick={toggleFullscreen}>{fullscreen ? "ออกจากเต็มจอ" : "เต็มจอ"}</button><label className={styles.motionChoice}><input type="checkbox" checked={reducedMotion} onChange={(event) => chooseReducedMotion(event.target.checked)} /><span>ลดการเคลื่อนไหว</span><small>เริ่มต้นตามอุปกรณ์</small></label><button type="button" onClick={() => setToolsVisible(false)}>ซ่อนเครื่องมือ</button></> : <button type="button" onClick={() => setToolsVisible(true)} aria-label="แสดงเครื่องมือเวที"><GiSettingsKnobs aria-hidden="true" /></button>}</div>
      {toolNotice && <p className={styles.toolNotice} role="status">{toolNotice}</p>}
      <header className={styles.stageHeading}><div className={styles.stageBrand}><GiCompass aria-hidden="true" /><span>Me Guild</span></div><p>THE LUCKY GARAPON</p><h2>{data?.title ?? "เวทีตั๋วนำโชค"}</h2><span>เครื่องหมุนแห่งเรื่องราว · เปิดชื่อสหายผู้โชคดี</span></header>
      {!resource ? <div className={styles.gate} aria-busy="true"><GiCompass aria-hidden="true" /><h3>กำลังเปิดบันทึกเวที…</h3></div> : resource.kind !== "ready" ? <div className={styles.gate}>{resource.kind === "anonymous" || resource.kind === "forbidden" ? <GiPadlock aria-hidden="true" /> : <GiOpenBook aria-hidden="true" />}<h3>{resource.kind === "anonymous" ? "เข้าสู่ระบบ Office เพื่อเปิดเวที" : resource.kind === "forbidden" ? "บัญชีนี้ไม่มีสิทธิ์เปิดเวทีกิจกรรม" : "ยังเชื่อมต่อเวทีไม่ได้"}</h3>{resource.kind === "error" && <p role="alert">{resource.message}</p>}<Link href={resource.kind === "anonymous" ? "/login" : "/operations/raffles"} className={styles.secondary}>{resource.kind === "anonymous" ? "เข้าสู่ระบบ Office" : "กลับหลังบ้าน"}</Link><button type="button" className={styles.secondary} onClick={() => setRefresh((value) => value + 1)}>ลองโหลดใหม่</button></div> : <>
        <div className={styles.stageStats}><span><GiTicket aria-hidden="true" /><b>{count(resource.data.entryCount)}</b> สิทธิ์ร่วมกิจกรรม</span><span><GiRoundStar aria-hidden="true" /><b>{count(resource.data.participantCount)}</b> ผู้ร่วมทาง</span><span><GiLaurels aria-hidden="true" /><b>{count(resource.data.revealedCount)}/{count(resource.data.totalWinners)}</b> ผู้โชคดี</span></div>
        {invalidated ? <div className={styles.invalidated} role="alert"><GiPadlock aria-hidden="true" /><h3>ข้อมูลรอบเปลี่ยน กรุณาตรวจหลังบ้าน</h3><p>เวทีพักการแสดงรายชื่อไว้จนกว่าผู้ดูแลจะตรวจสอบผลกิจกรรม</p></div> : <div className={styles.stageLayout}>
          <aside className={styles.prizeShelf} aria-label="รางวัลในเครื่องหมุน"><div className={styles.shelfHeading}><GiPresent aria-hidden="true" /><h3>สมบัติของเหล่าผู้โชคดี</h3></div><ol>{resource.data.prizes.map((item) => <li key={item.slot} data-state={item.state}><span className={styles.prizeNumber}>{String(item.slot + 1).padStart(2, "0")}</span><PrizeIcon kind={item.kind} /><div><strong>{item.label}</strong><small>{prizeKinds[item.kind]} · จำนวน {count(item.quantity)}</small><span>{item.state === "UNFILLED" ? "ไม่มีผู้รับรางวัลในช่องนี้" : item.state === "REVEALED" ? "เปิดผลแล้ว" : "รอเปิดผล"}</span></div></li>)}</ol>{resource.data.plannedWinnerCount > resource.data.totalWinners && <p className={styles.shelfNote}>รอบนี้มีผู้โชคดีที่บันทึกไว้ {count(resource.data.totalWinners)} คน จาก {count(resource.data.plannedWinnerCount)} ช่องรางวัล</p>}</aside>
          <div className={styles.machineColumn}><div className={styles.machineStatus} role="status">{animatingSlot !== null ? "เครื่องหมุนกำลังเปิดผลที่บันทึกไว้…" : currentWinner ? "สหายผู้โชคดีของเรา" : waiting ? phases[resource.data.phase] : resource.data.prepared ? "เครื่องหมุนพร้อมแล้ว · รอเปิดผู้โชคดีถัดไป" : "รอผู้ควบคุมเตรียมเครื่องหมุน"}</div><Tilt tiltEnable={motion && animatingSlot === null} tiltMaxAngleX={1.2} tiltMaxAngleY={1.5} scale={1} transitionSpeed={900} className={styles.machineTilt}><div className={styles.machine} data-spinning={animatingSlot !== null}><div className={styles.fallbackMachine} data-active={threeStatus !== "ready"} aria-hidden="true"><Garapon drumRef={drum} crankRef={crank} /><div ref={ball} className={styles.winnerBall} data-visible={currentWinner !== null || animatingSlot !== null} data-opening={animatingSlot !== null}><GiRoundStar aria-hidden="true" /><span className={styles.ballLabel}>{currentWinner ? "ผู้โชคดี" : "LUCKY TICKET"}</span>{currentWinner ? <strong title={currentWinner.displayName}>{currentWinner.displayName}</strong> : <span className={styles.neutralBall} aria-hidden="true">✦</span>}</div></div>{threeStatus !== "unavailable" ? <div className={styles.threeLayer} data-ready={threeStatus === "ready"} aria-hidden="true"><GaraponSceneBoundary onUnavailable={sceneUnavailable}><GaraponThree spinning={animatingSlot !== null} motion={motion} winningName={currentWinner?.displayName ?? null} revealKey={animatingSlot ?? currentWinner?.slot ?? -1} onReady={sceneReady} onUnavailable={sceneUnavailable} /></GaraponSceneBoundary></div> : null}</div></Tilt><div className={styles.winnerPlate} aria-live="polite" aria-atomic="true">{currentWinner ? <><span>{currentWinner.entryLabel}</span><h3>{currentWinner.displayName}</h3><p><PrizeIcon kind={currentWinner.kind} />{currentWinner.prizeLabel} <b>× {count(currentWinner.quantity)}</b></p></> : <><span>ME GUILD LUCKY DRAW</span><h3>{animatingSlot !== null ? "เรื่องราวกำลังเปิดเผย…" : resource.data.phase === "COMPLETE" && resource.data.totalWinners === 0 ? "ไม่มีผู้โชคดีในรอบนี้" : "ใครจะเป็นสหายผู้โชคดี"}</h3><p>{animatingSlot !== null ? `กำลังเปิดผล · ${resource.data.revealedWinners.find((winner) => winner.slot === animatingSlot)?.prizeLabel ?? "รางวัลของกิจกรรม"}` : resource.data.nextPrize ? `รางวัลถัดไป · ${resource.data.nextPrize.label}` : waiting ? "รอผลที่ระบบจัดเตรียมจากกิจกรรม" : "รายชื่อจะแสดงเมื่อผู้ควบคุมเปิดผล"}</p></>}</div>{animatingSlot !== null && <button type="button" className={styles.skipMotion} onClick={() => { heldSlot.current = null; setAnimatingSlot(null); }}>แสดงผลทันที</button>}</div>
          <aside className={styles.entryShelf} aria-label="ผู้ร่วมกิจกรรม"><div className={styles.shelfHeading}><GiTicket aria-hidden="true" /><h3>สหายร่วมทาง</h3></div><p className={styles.entryIntro}>รายชื่อผู้ร่วมกิจกรรม แสดงแยกจากผลผู้โชคดี</p>{resource.data.entryPagination.page === page ? <ul>{resource.data.entries.map((entry) => <li key={entry.code}><span>{entry.code}</span><strong>{entry.displayName}</strong><small>{count(entry.ticketCount)} สิทธิ์</small></li>)}</ul> : <p className={styles.entryIntro}>กำลังเปิดหน้ารายการ…</p>}{resource.data.entries.length === 0 && <p className={styles.entryIntro}>ยังไม่มีรายชื่อในหน้านี้</p>}<div className={styles.pagination}><button type="button" disabled={page <= 1 || !!pending} onClick={() => setPage((value) => value - 1)}>‹</button><span>หน้า {page}</span><button type="button" disabled={!resource.data.entryPagination.hasMore || !!pending || resource.data.entryPagination.page !== page} onClick={() => setPage((value) => value + 1)}>›</button></div></aside>
        </div>}
        {!invalidated && visibleWinners.length > 0 && <section className={styles.revealed} aria-labelledby="stage-revealed-title"><h3 id="stage-revealed-title"><GiLaurels aria-hidden="true" />บันทึกสหายผู้โชคดี</h3><div>{visibleWinners.map((winner) => <article key={winner.slot}><span>{String(winner.slot + 1).padStart(2, "0")}</span><div><strong>{winner.displayName}</strong><p>{winner.prizeLabel} × {count(winner.quantity)}</p></div><GiCheckMark aria-hidden="true" /></article>)}</div></section>}
      </>}
      <footer className={styles.stageFooter}><span>✦ ME GUILD ✦</span><p>{demo ? "โหมดตัวอย่าง · รายชื่อสมมติ · ไม่ใช้ตั๋วจริง · ไม่มีการเชื่อมต่อกิจกรรมจริง" : "แสดงผลที่บันทึกแล้วจากกิจกรรม · เชื่อมสถานะเวทีอัตโนมัติทุก 4 วินาที"}</p></footer>
    </section>
  </div>;
}

function Garapon({ drumRef, crankRef }: { drumRef: React.RefObject<SVGGElement | null>; crankRef: React.RefObject<SVGGElement | null> }) {
  const balls: [number, number, string][] = [[228,150,"#b5674c"],[290,130,"#6c8a63"],[350,164,"#dfbf68"],[218,215,"#dfbf68"],[285,198,"#dcd5b6"],[357,227,"#9c6767"],[251,272,"#7a9b8e"],[318,278,"#c18d4d"],[300,233,"#ead79c"],[266,167,"#8a9caa"],[330,201,"#6d8470"]];
  return <svg viewBox="0 0 600 570" className={styles.garapon} aria-hidden="true"><defs><linearGradient id="mg-drum-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d8b77c"/><stop offset=".5" stopColor="#9c733d"/><stop offset="1" stopColor="#d8b77c"/></linearGradient><linearGradient id="mg-drum-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f1db9e"/><stop offset=".45" stopColor="#b3914b"/><stop offset="1" stopColor="#e8ce85"/></linearGradient><radialGradient id="mg-drum-glass"><stop offset="0" stopColor="#faf4d8"/><stop offset="1" stopColor="#d9c79b"/></radialGradient><linearGradient id="mg-drum-base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#42624a"/><stop offset="1" stopColor="#1e3a2d"/></linearGradient></defs><ellipse cx="300" cy="524" rx="199" ry="24" fill="#203c3213"/><path d="M183 198L214 443H386L417 198" fill="none" stroke="url(#mg-drum-wood)" strokeWidth="29"/><path d="M189 205L219 442M411 205L381 442" stroke="#e0c28b" strokeWidth="3"/><path d="M192 437H407L434 481Q434 496 418 499H180Q164 494 169 480Z" fill="url(#mg-drum-base)" stroke="#ad8d4b" strokeWidth="5"/><path d="M182 483H420" stroke="#d7bb75" strokeWidth="3"/><path d="M297 332V405Q297 425 325 430" fill="none" stroke="#8c6838" strokeWidth="28"/><path d="M297 332V405Q297 425 325 430" fill="none" stroke="url(#mg-drum-gold)" strokeWidth="19"/><ellipse cx="326" cy="430" rx="14" ry="10" fill="#7b633c"/><g ref={drumRef} className={styles.drumSpin}><circle cx="297" cy="205" r="145" fill="url(#mg-drum-wood)" stroke="#7e5e31" strokeWidth="4"/><circle cx="297" cy="205" r="130" fill="url(#mg-drum-glass)" stroke="url(#mg-drum-gold)" strokeWidth="13"/>{balls.map(([cx,cy,fill],index)=><g key={index}><circle cx={cx} cy={cy} r="21" fill={fill} stroke="#ffffff70" strokeWidth="2"/><ellipse cx={cx-6} cy={cy-7} rx="6" ry="4" fill="#fff8"/></g>)}<path d="M183 187A117 117 0 0 1 352 103" fill="none" stroke="#fff9df9c" strokeWidth="8" strokeLinecap="round"/><circle cx="297" cy="205" r="44" fill="#294635" stroke="url(#mg-drum-gold)" strokeWidth="5"/><path d="M297 172L305 195L330 205L305 214L297 239L289 214L264 205L289 195Z" fill="#e7cb81"/>{[0,45,90,135,180,225,270,315].map((angle)=><circle key={angle} cx={297+138*Math.cos(angle*Math.PI/180)} cy={205+138*Math.sin(angle*Math.PI/180)} r="4" fill="#f0d99a"/>)}</g><path d="M443 205H477" stroke="#7e5e31" strokeWidth="17"/><path d="M443 202H477" stroke="url(#mg-drum-gold)" strokeWidth="8"/><g ref={crankRef} className={styles.crankSpin}><path d="M477 205L511 205L511 158" fill="none" stroke="#876638" strokeWidth="15" strokeLinejoin="round"/><path d="M477 202L508 202L508 158" fill="none" stroke="url(#mg-drum-gold)" strokeWidth="7"/><rect x="495" y="126" width="33" height="48" rx="15" fill="url(#mg-drum-base)" stroke="#b89a55" strokeWidth="3"/></g><circle cx="477" cy="205" r="12" fill="url(#mg-drum-gold)" stroke="#876638" strokeWidth="3"/><ellipse cx="302" cy="505" rx="135" ry="22" fill="#96723d" stroke="#ccb16e" strokeWidth="3"/><ellipse cx="302" cy="499" rx="133" ry="21" fill="#e2cc94"/><ellipse cx="302" cy="498" rx="112" ry="13" fill="#b59a5a"/></svg>;
}
