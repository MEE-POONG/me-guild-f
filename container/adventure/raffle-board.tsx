"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { GiCheckMark, GiCompass, GiCrown, GiLaurels, GiOpenBook, GiOpenTreasureChest, GiPadlock, GiPresent, GiRoundStar, GiScrollUnfurled, GiTicket } from "react-icons/gi";
import type { RaffleBoardData } from "@/lib/adventure-raffle-policy";
import styles from "./raffle-board.module.css";

type Campaign = RaffleBoardData["campaigns"][number];
type BoardResource = { kind: "ready"; data: RaffleBoardData; readAt: number } | { kind: "anonymous" } | { kind: "error"; message: string };
type EntryBody = { guildId: string; quantity: number; requestId: string; revision: string };
type Review = { campaignId: string; campaignTitle: string; serverName: string; balanceBefore: number; body: EntryBody };
type Receipt = { id: string; campaignId: string; tickets: number; createdAt: string };
type EntryResult = { kind: "idle" } | { kind: "submitting" } | { kind: "unknown"; message: string } | { kind: "failed"; message: string } | { kind: "success"; receipt: Receipt; replayed: boolean };
const statusLabels = { OPEN: "เปิดรับตั๋ว", CLOSED: "ปิดรับตั๋ว", DRAWN: "จับรางวัลแล้ว" };
const prizeLabels = { ROLE: "ยศ Discord", ITEM: "ไอเทม", BADGE: "ตราสัญลักษณ์" };
const winLabels: Record<string, string> = { AWAITING_CLAIM: "รอยืนยันสิทธิ์ใน Discord", CLAIMED: "ยืนยันสิทธิ์แล้ว · รอส่งมอบ", QUEUED: "รอคิวส่งมอบ", DELIVERY_BLOCKED: "รอผู้ดูแลตรวจการส่งมอบ", DELIVERED: "ส่งมอบแล้ว", RECEIVED: "รับของแล้ว", EXPIRED: "หมดเวลายืนยันสิทธิ์", FORFEITED: "สละสิทธิ์", REPLACED: "เปลี่ยนผู้รับรางวัลแล้ว", PENDING_DELIVERY: "อยู่ระหว่างส่งมอบ" };
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function integer(value: unknown, minimum = 0): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum; }
function text(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
function date(value: unknown): value is string { return text(value) && Number.isFinite(Date.parse(value)); }
function parseBoard(value: unknown): RaffleBoardData {
  if (!record(value) || value.source !== "live" || !record(value.member) || !text(value.member.displayName) || (value.member.avatarUrl !== null && !text(value.member.avatarUrl)) || !Array.isArray(value.servers) || !integer(value.balance) || !Array.isArray(value.campaigns) || !Array.isArray(value.entries) || !Array.isArray(value.wins)) throw new Error("ข้อมูลตั๋วนำโชคไม่สมบูรณ์ กรุณาลองโหลดใหม่");
  if (value.servers.some((server) => !record(server) || !text(server.id) || !text(server.name)) || (value.selectedGuildId !== null && (!text(value.selectedGuildId) || !value.servers.some((server) => server.id === value.selectedGuildId)))) throw new Error("ข้อมูลเซิร์ฟเวอร์ไม่สมบูรณ์");
  const validCampaign = (campaign: unknown) => record(campaign) && text(campaign.id) && text(campaign.title) && typeof campaign.description === "string" && text(campaign.status) && Object.hasOwn(statusLabels, campaign.status) && date(campaign.opensAt) && date(campaign.closesAt) && date(campaign.claimDeadline) && integer(campaign.ticketLimit, 1) && integer(campaign.ownEntries) && integer(campaign.totalEntries) && integer(campaign.winnerCount) && text(campaign.revision) && Array.isArray(campaign.prizes) && campaign.prizes.every((prize) => record(prize) && text(prize.kind) && Object.hasOwn(prizeLabels, prize.kind) && text(prize.label) && integer(prize.quantity, 1) && integer(prize.winnerCount, 1));
  if (!value.campaigns.every(validCampaign) || value.entries.some((entry) => !record(entry) || !text(entry.id) || !text(entry.campaignId) || !text(entry.campaignTitle) || !integer(entry.tickets, 1) || !date(entry.createdAt)) || value.wins.some((win) => !record(win) || !text(win.id) || !text(win.campaignId) || !text(win.campaignTitle) || !text(win.prizeLabel) || !text(win.status) || !date(win.claimDeadline) || (win.deliveredAt !== null && !date(win.deliveredAt)))) throw new Error("ข้อมูลกิจกรรมหรือประวัติไม่สมบูรณ์ กรุณาลองโหลดใหม่");
  return value as RaffleBoardData;
}
function parseReceipt(value: unknown, review: Review): { receipt: Receipt; replayed: boolean } {
  if (!record(value) || typeof value.replayed !== "boolean" || !record(value.receipt) || !text(value.receipt.id) || value.receipt.campaignId !== review.campaignId || value.receipt.tickets !== review.body.quantity || !date(value.receipt.createdAt)) throw new Error("ยังตรวจผลรายการไม่ได้ กรุณาตรวจสอบรายการเดิมอีกครั้ง");
  return { receipt: value.receipt as Receipt, replayed: value.replayed };
}
function dateLabel(value: string) { return new Date(value).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function count(value: number) { return value.toLocaleString("th-TH"); }
function PrizeIcon({ kind }: { kind: "ROLE" | "ITEM" | "BADGE" }) { return kind === "ROLE" ? <GiCrown aria-hidden="true" /> : kind === "BADGE" ? <GiLaurels aria-hidden="true" /> : <GiOpenTreasureChest aria-hidden="true" />; }

export function RaffleBoard() {
  const [guildId, setGuildId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [resource, setResource] = useState<BoardResource | null>(null);
  const [completedRequest, setCompletedRequest] = useState<string | null>(null);
  const requestKey = `${guildId ?? "default"}:${reload}`;
  const loading = completedRequest !== requestKey;
  const previousData = resource?.kind === "ready" ? resource.data : null;
  const data = !loading ? previousData : null;
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [filter, setFilter] = useState<"ALL" | Campaign["status"]>("ALL");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"campaigns" | "entries" | "wins">("campaigns");
  const [review, setReview] = useState<Review | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [entryResult, setEntryResult] = useState<EntryResult>({ kind: "idle" });
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogHeading = useRef<HTMLHeadingElement>(null);
  const mutationController = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const submitting = useRef(false);
  const entryPending = entryResult.kind === "submitting";
  const unresolved = entryPending || entryResult.kind === "unknown";
  const campaigns = data?.campaigns.filter((campaign) => (filter === "ALL" || campaign.status === filter) && `${campaign.title} ${campaign.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) ?? [];
  const active = data?.campaigns.find((campaign) => campaign.id === campaignId) ?? data?.campaigns[0] ?? null;
  const remainingLimit = active ? Math.max(0, active.ticketLimit - active.ownEntries) : 0;
  const maximum = Math.min(data?.balance ?? 0, remainingLimit);
  const readAt = !loading && resource?.kind === "ready" ? resource.readAt : 0;
  const openNow = !!active && active.status === "OPEN" && Date.parse(active.opensAt) <= readAt && Date.parse(active.closesAt) > readAt;

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      controller.abort(); setResource({ kind: "error", message: "การเชื่อมต่อใช้เวลานาน กรุณาลองเปิดกระดานใหม่" }); setCompletedRequest(requestKey);
    }, 12_000);
    const params = guildId ? `?${new URLSearchParams({ guildId })}` : "";
    fetch(`/api/adventure/raffles${params}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) { if (!controller.signal.aborted) { setResource({ kind: "anonymous" }); setCompletedRequest(requestKey); } return; }
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(record(payload) && typeof payload.error === "string" ? payload.error : "ยังเปิดข้อมูลตั๋วนำโชคไม่ได้ กรุณาลองใหม่เมื่อบริการพร้อม");
        const board = parseBoard(payload);
        if (!controller.signal.aborted) { setResource({ kind: "ready", data: board, readAt: Date.now() }); setCompletedRequest(requestKey); }
      }).catch((failure: unknown) => { if (!controller.signal.aborted) { setResource({ kind: "error", message: failure instanceof Error ? failure.message : "ยังโหลดข้อมูลไม่ได้ กรุณาลองใหม่" }); setCompletedRequest(requestKey); } })
      .finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [guildId, reload, requestKey]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; mutationController.current?.abort(); }; }, []);
  useEffect(() => {
    const element = dialog.current;
    if (reviewOpen && review && element && !element.open) element.showModal();
    if (!reviewOpen && element?.open) element.close();
  }, [reviewOpen, review]);
  useEffect(() => { if (dialog.current?.open && entryResult.kind !== "idle") dialogHeading.current?.focus({ preventScroll: true }); }, [entryResult.kind]);

  const refresh = () => { setFormError(""); setReload((value) => value + 1); };
  const selectServer = (id: string) => { if (unresolved) return; setGuildId(id || null); setCampaignId(null); setQuantity("1"); setQuery(""); setFilter("ALL"); setNotice(""); setFormError(""); setReview(null); setReviewOpen(false); setEntryResult({ kind: "idle" }); };
  const prepareEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError(""); setNotice("");
    if (!data?.selectedGuildId || !active || unresolved) return;
    const amount = Number(quantity);
    if (!/^\d+$/.test(quantity) || !Number.isSafeInteger(amount) || amount < 1 || amount > maximum) { setFormError(`กรุณาระบุจำนวนเต็มตั้งแต่ 1 ถึง ${count(maximum)} ใบ`); return; }
    if (active.status !== "OPEN" || Date.parse(active.opensAt) > Date.now() || Date.parse(active.closesAt) <= Date.now()) { setFormError("รอบนี้ยังไม่เปิดหรือปิดรับตั๋วแล้ว กรุณาโหลดข้อมูลล่าสุด"); return; }
    setReview({ campaignId: active.id, campaignTitle: active.title, serverName: data.servers.find((server) => server.id === data.selectedGuildId)?.name ?? "เซิร์ฟเวอร์ที่เลือก", balanceBefore: data.balance, body: { guildId: data.selectedGuildId, quantity: amount, requestId: crypto.randomUUID(), revision: active.revision } });
    setEntryResult({ kind: "idle" }); setReviewOpen(true);
  };
  const submitEntry = async () => {
    if (!review || submitting.current || (entryResult.kind !== "idle" && entryResult.kind !== "unknown")) return;
    submitting.current = true; setEntryResult({ kind: "submitting" });
    const controller = new AbortController(); mutationController.current = controller;
    const isCurrent = () => mounted.current && mutationController.current === controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      if (!isCurrent() || controller.signal.aborted) return;
      timedOut = true; controller.abort(); submitting.current = false;
      setEntryResult({ kind: "unknown", message: "การเชื่อมต่อใช้เวลานาน ยังยืนยันผลรายการไม่ได้ โปรดตรวจสอบรายการเดิมก่อนเริ่มรายการใหม่" });
    }, 15_000);
    try {
      const response = await fetch(`/api/adventure/raffles/${encodeURIComponent(review.campaignId)}/entries`, { method: "POST", credentials: "same-origin", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(review.body) });
      const payload: unknown = await response.json().catch(() => null);
      if (!isCurrent()) return;
      if (controller.signal.aborted && !timedOut) return;
      if (!response.ok) {
        const message = record(payload) && typeof payload.error === "string" ? payload.error : "ยังบันทึกการใช้ตั๋วไม่ได้ กรุณาตรวจข้อมูลล่าสุด";
        if (response.status >= 500) setEntryResult({ kind: "unknown", message: "ยังยืนยันผลรายการไม่ได้ กรุณาตรวจสอบรายการเดิมอีกครั้ง ระบบจะใช้รหัสรายการเดิมเพื่อป้องกันการส่งซ้ำ" });
        else { setEntryResult({ kind: "failed", message }); if (response.status === 401) { setResource({ kind: "anonymous" }); setCompletedRequest(requestKey); } }
        return;
      }
      const result = parseReceipt(payload, review);
      setEntryResult({ kind: "success", ...result }); setNotice(`บันทึกสิทธิ์ลุ้นรางวัล ${count(result.receipt.tickets)} สิทธิ์ใน “${review.campaignTitle}” แล้ว`); setQuantity("1"); setGuildId(review.body.guildId); setReload((value) => value + 1);
    } catch (failure) {
      if (isCurrent() && (!controller.signal.aborted || timedOut)) setEntryResult({ kind: "unknown", message: failure instanceof Error && !timedOut && failure.name !== "TypeError" && failure.name !== "AbortError" ? failure.message : "การเชื่อมต่อขาดช่วง ยังยืนยันผลรายการไม่ได้ โปรดตรวจสอบรายการเดิมก่อนเริ่มรายการใหม่" });
    } finally { window.clearTimeout(timeout); if (isCurrent()) submitting.current = false; }
  };
  const closeReview = () => {
    setReviewOpen(false);
    if (!unresolved) { setReview(null); setEntryResult({ kind: "idle" }); }
  };
  const closeAndRefresh = () => { setReviewOpen(false); setReview(null); setEntryResult({ kind: "idle" }); refresh(); };

  return <div className={styles.page}>
    <header className={styles.masthead}><Link href="/adventure" className={styles.brand}><GiCompass aria-hidden="true" /><span>Me Guild<small>หอชุมชนของนักเดินทาง</small></span></Link><Link href="/adventure?community=rewards#community">‹ &nbsp; กลับหอชุมชน</Link></header>
    <main className={styles.main}>
      <header className={styles.heading}><span><GiTicket aria-hidden="true" /></span><div><p className={styles.eyebrow}>THE LUCKY TICKET BOARD</p><h1>กระดานตั๋วนำโชค</h1><p>เลือกกิจกรรมที่สนใจ ใช้ตั๋วสะสมจาก Discord และติดตามรางวัลของคุณ</p></div></header>
      <div className={styles.sourceNote}><GiScrollUnfurled aria-hidden="true" /><span>ข้อมูลจากบัญชี Discord ของคุณ · 1 ตั๋วสะสม = 1 สิทธิ์ลุ้นรางวัล</span></div>
      {!loading && resource?.kind === "anonymous" ? <section className={styles.gate}><GiPadlock aria-hidden="true" /><h2>เปิดกระเป๋าตั๋วของคุณ</h2><p>เข้าสู่ระบบสมาชิกด้วย Discord เพื่อดูเซิร์ฟเวอร์ ยอดตั๋ว และประวัติรางวัลของคุณ</p><Link href="/adventure/login?returnTo=%2Fadventure%2Fraffles" className={styles.primary}>เข้าสู่ระบบด้วย Discord</Link></section> : null}
      {!loading && resource?.kind === "error" ? <section className={styles.gate}><GiOpenBook aria-hidden="true" /><h2>ยังเปิดกระดานไม่ได้</h2><p role="alert">{resource.message}</p><button type="button" className={styles.primary} onClick={refresh}>ลองโหลดใหม่</button></section> : null}
      {(previousData || loading) && <section className={styles.walletBar} aria-label="กระเป๋าตั๋วและเซิร์ฟเวอร์"><div className={styles.wallet}><GiTicket aria-hidden="true" /><div><span>ตั๋วสะสมที่ใช้ได้</span><strong>{data ? count(data.balance) : "—"}<small> ใบ</small></strong></div></div><div className={styles.serverField}><label htmlFor="raffle-server">เลือกเซิร์ฟเวอร์</label><select id="raffle-server" value={data?.selectedGuildId ?? guildId ?? ""} onChange={(event) => selectServer(event.target.value)} disabled={!previousData?.servers.length || unresolved}><option value="" disabled>เลือกเซิร์ฟเวอร์ของคุณ</option>{previousData?.servers.map((server) => <option key={server.id} value={server.id}>{server.name}</option>)}</select><small>{data ? `บันทึกของ ${data.member.displayName}` : "กำลังตรวจสอบข้อมูล…"}</small></div><button type="button" className={styles.refresh} disabled={loading || entryPending} onClick={refresh}>↻ โหลดข้อมูลล่าสุด</button></section>}
      {unresolved && review && <div className={styles.pendingNotice} role="status"><GiScrollUnfurled aria-hidden="true" /><div><strong>{entryPending ? "กำลังตรวจและบันทึกการใช้ตั๋ว" : "มีรายการที่ยังยืนยันผลไม่ได้"}</strong><p>{review.campaignTitle} · {count(review.body.quantity)} ใบ · กรุณาตรวจรายการนี้ก่อนเริ่มรายการใหม่</p></div><button type="button" onClick={() => setReviewOpen(true)}>เปิดรายละเอียดรายการเดิม</button></div>}
      {notice && <p className={styles.successNotice} role="status"><GiCheckMark aria-hidden="true" />{notice}</p>}
      {loading ? <section className={styles.loading} aria-busy="true" aria-live="polite"><GiCompass aria-hidden="true" /><h2>กำลังเปิดกระดานของคุณ…</h2><p>ตรวจยอดตั๋วและกิจกรรมล่าสุดจากเซิร์ฟเวอร์</p></section> : null}
      {data && data.servers.length === 0 ? <section className={styles.gate}><GiCompass aria-hidden="true" /><h2>ยังไม่มีเซิร์ฟเวอร์ที่เปิดกระดานตั๋ว</h2><p>ตรวจว่าคุณเป็นสมาชิกเซิร์ฟเวอร์ Discord ที่เปิดระบบตั๋วสะสม แล้วลองโหลดข้อมูลอีกครั้ง</p><button type="button" className={styles.secondary} onClick={refresh}>ตรวจสอบอีกครั้ง</button></section> : null}
      {data && data.servers.length > 0 ? <>
        <nav className={styles.tabs} aria-label="รายการตั๋วนำโชค"><button type="button" aria-pressed={view === "campaigns"} onClick={() => setView("campaigns")}><GiPresent aria-hidden="true" />รอบกิจกรรม<span>{data.campaigns.length}</span></button><button type="button" aria-pressed={view === "entries"} onClick={() => setView("entries")}><GiTicket aria-hidden="true" />ประวัติส่งตั๋ว<span>{data.entries.length}</span></button><button type="button" aria-pressed={view === "wins"} onClick={() => setView("wins")}><GiLaurels aria-hidden="true" />รางวัลของฉัน<span>{data.wins.length}</span></button></nav>
        {view === "campaigns" ? <div className={styles.boardLayout}>
          <section className={styles.campaignSection} aria-labelledby="raffle-rounds"><div className={styles.sectionTitle}><h2 id="raffle-rounds">เลือกบทแห่งโชคของคุณ</h2><span>{data.campaigns.length} รอบในเซิร์ฟเวอร์นี้</span></div><div className={styles.filters}><label className={styles.search}><span>ค้นหากิจกรรม</span><input type="search" value={query} maxLength={160} onChange={(event) => setQuery(event.target.value)} placeholder="ชื่อหรือเรื่องราวของกิจกรรม…" /></label><label><span>สถานะรอบ</span><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="ALL">ทุกรอบ</option><option value="OPEN">เปิดรับตั๋ว</option><option value="CLOSED">ปิดรับตั๋ว</option><option value="DRAWN">จับรางวัลแล้ว</option></select></label></div>{campaigns.length ? <div className={styles.campaigns}>{campaigns.map((campaign) => <article key={campaign.id} className={active?.id === campaign.id ? styles.activeCampaign : ""}><button type="button" className={styles.selectCampaign} aria-pressed={active?.id === campaign.id} onClick={() => { setCampaignId(campaign.id); setQuantity("1"); setFormError(""); }}><span className={styles.campaignMark}><GiPresent aria-hidden="true" /></span><span><span className={styles.status} data-status={campaign.status}>{statusLabels[campaign.status]}</span><strong>{campaign.title}</strong><span className={styles.campaignDescription}>{campaign.description}</span></span><span className={styles.chooseArrow} aria-hidden="true">›</span></button><div className={styles.campaignDetails}><p><GiRoundStar aria-hidden="true" /><strong>ผู้โชคดีสูงสุด {count(campaign.winnerCount)} คน</strong><span>· สิทธิ์ของคุณ {count(campaign.ownEntries)}</span></p><ul className={styles.prizes}>{campaign.prizes.map((prize, index) => <li key={`${index}-${prize.label}`}><PrizeIcon kind={prize.kind} /><div><strong>{prize.label}</strong><small>{prizeLabels[prize.kind]} · คนละ {count(prize.quantity)} · {count(prize.winnerCount)} ผู้โชคดี</small></div></li>)}</ul><div className={styles.campaignTimes}><span>เปิดรับ {dateLabel(campaign.opensAt)}</span><span>ปิดรับ {dateLabel(campaign.closesAt)}</span><span>ยืนยันสิทธิ์ก่อน {dateLabel(campaign.claimDeadline)}</span><span>รวม {count(campaign.totalEntries)} สิทธิ์</span></div></div></article>)}</div> : <div className={styles.empty}><GiPresent aria-hidden="true" /><h3>{data.campaigns.length ? "ยังไม่พบรอบที่ตรงกับการค้นหา" : "ยังไม่มีรอบกิจกรรมในเซิร์ฟเวอร์นี้"}</h3><p>{data.campaigns.length ? "ลองเปลี่ยนคำค้นหรือสถานะรอบ" : "เมื่อผู้ดูแลเปิดรอบที่เข้าร่วมได้ รายการจะปรากฏที่นี่"}</p></div>}</section>
          <aside className={styles.entryPanel}><section className={styles.entryCard}><div className={styles.entryHeader}><GiTicket aria-hidden="true" /><h2>ใช้ตั๋วเข้าร่วมกิจกรรม</h2></div>{active ? <><p className={styles.selectedLabel}>รอบที่เลือก</p><h3>{active.title}</h3><dl><div><dt>สิทธิ์ของคุณในรอบนี้</dt><dd>{count(active.ownEntries)} / {count(active.ticketLimit)}</dd></div><div><dt>ยังเข้าร่วมเพิ่มได้</dt><dd>{count(remainingLimit)} สิทธิ์</dd></div><div><dt>ตั๋วสะสมที่ใช้ได้</dt><dd>{count(data.balance)} ใบ</dd></div></dl><p className={styles.limitNote}>เพดานต่อคนรวมสิทธิ์ที่ใช้ผ่าน Discord แล้ว</p><form onSubmit={prepareEntry}><label htmlFor="raffle-quantity">จำนวนตั๋วที่จะใช้</label><div className={styles.quantityInput}><input id="raffle-quantity" type="number" inputMode="numeric" min={1} max={Math.max(1, maximum)} step={1} required value={quantity} disabled={!openNow || maximum < 1 || unresolved} onChange={(event) => setQuantity(event.target.value)} /><span>ใบ</span></div><p className={styles.costNote}>ใช้ 1 ใบ ต่อ 1 สิทธิ์ลุ้นรางวัล</p>{formError && <p className={styles.error} role="alert">{formError}</p>}<button type="submit" className={styles.primary} disabled={!openNow || maximum < 1 || unresolved}>ตรวจรายการก่อนใช้ตั๋ว <span aria-hidden="true">›</span></button></form>{!openNow ? <p className={styles.entryHint}>{active.status === "DRAWN" ? "รอบนี้จับรางวัลแล้ว ดูสิทธิ์ของคุณได้ในรางวัลของฉัน" : Date.parse(active.opensAt) > readAt ? `เริ่มรับตั๋ว ${dateLabel(active.opensAt)}` : "รอบนี้ปิดรับตั๋วแล้ว"}</p> : maximum < 1 ? <p className={styles.entryHint}>{remainingLimit < 1 ? "คุณเข้าร่วมครบเพดานของรอบนี้แล้ว" : "ตั๋วสะสมยังไม่พอสำหรับเข้าร่วมรอบนี้"}</p> : <p className={styles.entryHint}>ยังไม่หักตั๋วในขั้นตอนนี้ คุณจะได้ตรวจและยืนยันอีกครั้ง</p>}</> : <div className={styles.emptyEntry}><GiScrollUnfurled aria-hidden="true" /><p>เลือกรอบกิจกรรมเพื่อดูจำนวนตั๋วที่ใช้เข้าร่วมได้</p></div>}</section><div className={styles.rules}><GiOpenBook aria-hidden="true" /><div><h3>บันทึกจากผู้ดูแลกระดาน</h3><p>ใช้ตั๋วแล้วจึงได้สิทธิ์ลุ้นรางวัล ผลรางวัลขึ้นอยู่กับการจับของแต่ละกิจกรรม</p><p>ยอดตั๋วและสิทธิ์จะตรวจอีกครั้งเมื่อยืนยันรายการ</p><p>แต่ละคนรับได้สูงสุด 1 รางวัลต่อรอบ หากผู้เข้าร่วมไม่พอ จำนวนผู้รับจริงอาจน้อยกว่าที่กำหนด</p></div></div></aside>
        </div> : null}
        {view === "entries" ? <section className={styles.historySection}><div className={styles.sectionTitle}><h2>บันทึกตั๋วที่ใช้ไป</h2><span>รายการของคุณในเซิร์ฟเวอร์ที่เลือก</span></div>{data.entries.length ? <div className={styles.entryHistory}>{data.entries.map((entry) => <article key={entry.id}><span className={styles.historyIcon}><GiTicket aria-hidden="true" /></span><div><h3>{entry.campaignTitle}</h3><p>{dateLabel(entry.createdAt)}</p></div><strong>{count(entry.tickets)}<small> สิทธิ์</small></strong></article>)}</div> : <div className={styles.empty}><GiTicket aria-hidden="true" /><h3>ยังไม่มีรายการใช้ตั๋วของคุณ</h3><p>เมื่อลงตั๋วเข้าร่วมกิจกรรม รายการจะบันทึกไว้ที่นี่</p></div>}</section> : null}
        {view === "wins" ? <section className={styles.historySection}><div className={styles.sectionTitle}><h2>รางวัลและการส่งมอบของฉัน</h2><span>แสดงเฉพาะรางวัลของบัญชีคุณ</span></div><p className={styles.discordInstruction}>ยืนยันสิทธิ์ผ่านคำสั่ง <code>/raffle claim</code> และตรวจการรับของด้วย <code>/raffle receive</code> ใน Discord ของเซิร์ฟเวอร์กิจกรรม</p>{data.wins.length ? <div className={styles.winHistory}>{data.wins.map((win) => <article key={win.id}><span className={styles.winIcon}><GiLaurels aria-hidden="true" /></span><div><span className={styles.winStatus} data-status={win.status}>{Object.hasOwn(winLabels, win.status) ? winLabels[win.status] : "ตรวจสถานะล่าสุดใน Discord"}</span><h3>{win.prizeLabel}</h3><p>{win.campaignTitle}</p><small>{win.deliveredAt ? `ส่งมอบ ${dateLabel(win.deliveredAt)}` : `ยืนยันสิทธิ์ภายใน ${dateLabel(win.claimDeadline)}`}</small></div></article>)}</div> : <div className={styles.empty}><GiOpenTreasureChest aria-hidden="true" /><h3>ยังไม่มีรางวัลในบันทึกของคุณ</h3><p>เมื่อได้รับเลือกเป็นผู้โชคดี รางวัลและสถานะส่งมอบจะปรากฏที่นี่</p></div>}</section> : null}
      </> : null}
      <p className={styles.footerNote}>ยอดตั๋ว รางวัล และรายการเข้าร่วมมาจากระบบจริงของเซิร์ฟเวอร์ที่เลือก</p>
    </main>
    <dialog ref={dialog} className={styles.confirmDialog} aria-labelledby="raffle-confirm-heading" onClose={closeReview}><header><span><GiTicket aria-hidden="true" /></span><h2 ref={dialogHeading} id="raffle-confirm-heading" tabIndex={-1}>{entryResult.kind === "success" ? "บันทึกสิทธิ์ลุ้นรางวัลแล้ว" : entryResult.kind === "unknown" ? "ตรวจผลรายการเดิม" : entryResult.kind === "failed" ? "ยังใช้ตั๋วรายการนี้ไม่ได้" : "ตรวจรายการก่อนใช้ตั๋ว"}</h2><button type="button" aria-label={unresolved ? "ซ่อนหน้าต่างรายละเอียดรายการ" : "ปิดหน้าต่างยืนยัน"} onClick={() => dialog.current?.close()}>×</button></header>{review && <div className={styles.confirmBody}><p className={styles.reviewServer}>{review.serverName}</p><h3>{review.campaignTitle}</h3>{entryResult.kind === "success" ? <><div className={styles.receiptSuccess}><GiCheckMark aria-hidden="true" /><strong>{count(entryResult.receipt.tickets)} สิทธิ์</strong><span>{entryResult.replayed ? "ยืนยันผลของรายการเดิมแล้ว" : "ระบบบันทึกรายการของคุณแล้ว"}</span></div><p className={styles.receiptDate}>{dateLabel(entryResult.receipt.createdAt)}</p><p className={styles.confirmHint}>กำลังแสดงยอดและประวัติล่าสุดบนกระดาน ติดตามผลได้ในรางวัลของฉันเมื่อกิจกรรมจับรางวัลแล้ว</p><button type="button" className={styles.primary} onClick={() => dialog.current?.close()}>กลับไปที่กระดาน</button></> : <><dl className={styles.reviewAmounts}><div><dt>ตั๋วสะสมที่จะใช้</dt><dd>{count(review.body.quantity)} ใบ</dd></div><div><dt>สิทธิ์ลุ้นรางวัลที่จะได้รับ</dt><dd>{count(review.body.quantity)} สิทธิ์</dd></div><div><dt>ยอดหลังรายการตามที่ตรวจล่าสุด</dt><dd>{count(Math.max(0, review.balanceBefore - review.body.quantity))} ใบ</dd></div></dl><p className={styles.confirmHint}>ยืนยันแล้วระบบจะหักตั๋วสะสมจากเซิร์ฟเวอร์นี้ และตรวจยอดกับเพดานรอบอีกครั้ง</p>{entryResult.kind === "unknown" || entryResult.kind === "failed" ? <p className={styles.error} role="alert">{entryResult.message}</p> : null}{entryResult.kind === "submitting" && <p role="status" className={styles.pendingText}>กำลังตรวจและบันทึก… ยังไม่ต้องส่งรายการใหม่</p>}<div className={styles.confirmActions}>{entryResult.kind === "failed" ? <button type="button" className={styles.primary} onClick={closeAndRefresh}>ปิดและโหลดข้อมูลล่าสุด</button> : <button type="button" className={styles.primary} disabled={entryPending} onClick={() => void submitEntry()}>{entryPending ? "กำลังบันทึกรายการ…" : entryResult.kind === "unknown" ? "ตรวจสอบรายการเดิมอีกครั้ง" : `ยืนยันใช้ตั๋ว ${count(review.body.quantity)} ใบ`}</button>}<button type="button" className={styles.secondary} autoFocus onClick={() => dialog.current?.close()}>{unresolved ? "ซ่อนหน้าต่าง · เก็บรายการนี้ไว้" : "กลับไปแก้ไข"}</button></div></>}</div>}</dialog>
  </div>;
}
