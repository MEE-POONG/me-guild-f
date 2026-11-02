"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { animate, createScope } from "animejs";
import Tilt from "react-parallax-tilt";
import { GiCompass, GiKnapsack, GiSwapBag, GiHammerDrop, GiTwoCoins, GiPadlock, GiOpenTreasureChest } from "react-icons/gi";
import { businessAuthorizationUrl, auctionBidCost, marketLedgerLabel, marketplaceLoginUrl, marketStatus, offersEqual, parseTradeCopper, pendingTrade, tradeCopper, tradeOfferSummary, tradeConfirmationCurrent, type MarketAction, type MarketAuction, type MarketItem, type MarketSnapshot, type MarketTrade, type MarketView } from "@/lib/marketplace-types";
import styles from "./marketplace.module.css";

type Confirmation = { title: string; detail: string; label: string; action: MarketAction };
type PendingRequest = { requestId: string; guildId: string; action: string; [key: string]: unknown };
const subscribeMotion = (notify: () => void) => { const query = window.matchMedia("(prefers-reduced-motion: reduce)"); query.addEventListener("change", notify); return () => query.removeEventListener("change", notify); };
const date = (value: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
const money = (value: number) => value.toLocaleString("th-TH");
const activeTrade = (trade: MarketTrade) => ["OPEN", "DRAFT", "LOCKED"].includes(trade.status);

function ItemArt({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.itemArt}>{src && !failed ? <Image unoptimized src={src} alt={name} width={96} height={96} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <GiOpenTreasureChest aria-hidden="true" />}</div>;
}

function OfferEditor({ trade, inventory, memberId, busy, perform, confirm }: {
  trade: MarketTrade; inventory: MarketItem[]; memberId: string; busy: boolean;
  perform: (action: MarketAction) => void; confirm: (value: Confirmation) => void;
}) {
  const offer = trade.offers[memberId] ?? [];
  const [quantities, setQuantities] = useState<Record<string, number>>(() => Object.fromEntries(offer.map((item) => [item.itemId, item.quantity])));
  const savedCopper = tradeCopper(trade, memberId);
  const [copperInput, setCopperInput] = useState(String(savedCopper));
  const copper = parseTradeCopper(copperInput);
  const items = Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([itemId, quantity]) => ({ itemId, quantity }));
  const dirty = !offersEqual(items, offer) || copper !== savedCopper;
  const choices = [...inventory, ...offer.filter((item) => !inventory.some((available) => available.itemId === item.itemId)).map((item) => ({ ...item, quantity: 0 }))];
  return <div className={styles.offerEditor}>
    <form onSubmit={(event) => { event.preventDefault(); if (copper === null) return; perform({ action: "trade.offer", tradeId: trade.id, expectedRevision: trade.revision, items, copper }); }}>
      <fieldset disabled={busy}><legend>วางไอเทมและ Copper ของคุณ</legend>
        {choices.length ? choices.map((item) => <label className={styles.quantityRow} key={item.itemId}><span>{item.name}<small>{item.quantity ? `มี ${money(item.quantity)} ชิ้น` : "ไม่มีของพร้อมใช้ · เปลี่ยนจำนวนเป็น 0 เพื่อนำออก"}</small></span><input aria-label={`จำนวน ${item.name}`} type="number" min={0} max={item.quantity} step={1} value={quantities[item.itemId] ?? 0} onChange={(event) => setQuantities((previous) => ({ ...previous, [item.itemId]: Number(event.target.value) }))} /></label>) : <p>ไม่มีไอเทมพร้อมแลก คุณยังเสนอ Copper ได้</p>}
        <label className={styles.quantityRow} htmlFor={`trade-copper-${trade.id}`}><span>Copper ที่เสนอ<small id={`trade-copper-help-${trade.id}`}>จำนวนเต็ม 0–1,000,000 • กันจากกระเป๋าหลัก ME Coin เมื่อล็อก</small></span><input id={`trade-copper-${trade.id}`} name="copper" type="text" inputMode="numeric" required pattern="(0|[1-9][0-9]{0,5}|1000000)" maxLength={7} aria-describedby={`trade-copper-help-${trade.id}`} value={copperInput} onChange={(event) => setCopperInput(event.target.value)} /></label>
        <button type="submit" className={styles.secondary} disabled={!dirty}>บันทึกข้อเสนอ</button>
      </fieldset>
    </form>
    <button className={styles.primary} disabled={busy || dirty || (!offer.length && savedCopper === 0)} onClick={() => confirm({ title: "ล็อกข้อเสนอไอเทมและ Copper", detail: `${tradeOfferSummary(trade, memberId)} • ล็อกเฉพาะข้อเสนอของคุณและกัน ${money(savedCopper)} Copper จากกระเป๋าหลัก เมื่อยืนยันครบสองฝ่ายจึงโอนและส่งมอบ`, label: `ล็อกข้อเสนอ ${money(savedCopper)} Copper`, action: { action: "trade.lock", tradeId: trade.id, expectedRevision: trade.revision } })}><GiPadlock aria-hidden="true" />ล็อกข้อเสนอ</button>
    {dirty ? <small>บันทึกรายการที่แก้ก่อนกดล็อก</small> : null}
  </div>;
}

function TradeCard({ trade, snapshot, busy, perform, confirm }: { trade: MarketTrade; snapshot: MarketSnapshot; busy: boolean; perform: (action: MarketAction) => void; confirm: (value: Confirmation) => void }) {
  const memberId = snapshot.member.discordId, ownLocked = trade.lockedIds.includes(memberId), ownConfirmed = trade.confirmedIds.includes(memberId);
  const bothLocked = trade.participantIds.every((id) => trade.lockedIds.includes(id));
  const open = activeTrade(trade);
  const pending = pendingTrade(trade);
  const summary = tradeOfferSummary(trade, memberId);
  return <article className={styles.tradeCard}>
    <header className={styles.cardHeading}><div><span className={styles.eyebrow}>TRADE · {trade.id.slice(-8)}</span><h3>แลกเปลี่ยนกับ {trade.participantIds.find((id) => id !== memberId)}</h3></div><span className={styles.badge}>{marketStatus[trade.status] ?? trade.status}</span></header>
    <div className={styles.offerSides}>{trade.participantIds.map((id) => <section key={id} className={trade.lockedIds.includes(id) ? styles.lockedSide : styles.offerSide}>
      <h4>{id === memberId ? "ของคุณ" : "ของอีกฝ่าย"}<span>{trade.confirmedIds.includes(id) ? "ยืนยันแล้ว ✓" : trade.lockedIds.includes(id) ? "ล็อกแล้ว" : "กำลังจัดของ"}</span></h4>
      <p><GiTwoCoins aria-hidden="true" /> Copper ที่เสนอ: <strong>{money(tradeCopper(trade, id))} Copper</strong></p>
      {(trade.offers[id] ?? []).length ? <ul>{trade.offers[id].map((item) => <li key={item.itemId}><span>{item.name}</span><strong>× {money(item.quantity)}</strong></li>)}</ul> : <p className={styles.muted}>ไม่มีไอเทมในข้อเสนอ</p>}
    </section>)}</div>
    {open && !ownLocked ? <OfferEditor key={`${trade.id}:${trade.revision}`} trade={trade} inventory={snapshot.inventory} memberId={memberId} busy={busy} perform={perform} confirm={confirm} /> : null}
    {open && ownLocked ? <p className={styles.lockNote}><GiPadlock aria-hidden="true" />{bothLocked ? "ทั้งสองฝ่ายล็อกแล้ว ตรวจไอเทมและ Copper ทั้งสองฝั่งก่อนยืนยัน" : "ข้อเสนอของคุณถูกล็อกแล้ว รออีกฝ่ายล็อก"}</p> : null}
    {pending ? <p className={styles.lockNote} role="status">ผลรายการยังไม่เสร็จสิ้น ระบบกำลังตรวจไอเทมและ Copper กดตรวจผลรายการเดิมเพื่อทำต่อได้</p> : null}
    <footer className={styles.actions}>
      {open ? <><button className={styles.secondary} disabled={busy} onClick={() => confirm({ title: "ยกเลิกการแลกเปลี่ยน", detail: `${summary} • ไอเทมและ Copper ที่กันไว้จะคืนให้เจ้าของแต่ละคนเมื่อระบบยืนยันการยกเลิก`, label: "ยกเลิกรายการนี้", action: { action: "trade.cancel", tradeId: trade.id, expectedRevision: trade.revision } })}>ยกเลิกการแลก</button><button className={styles.primary} disabled={busy || !bothLocked || ownConfirmed} onClick={() => confirm({ title: "ยืนยันแลกเปลี่ยนไอเทมและ Copper", detail: `${summary} • เมื่อยืนยันครบสองฝ่าย ระบบจะโอน Copper และส่งไอเทมตามข้อเสนอทั้งสองฝั่ง`, label: `ยืนยันส่ง ${money(tradeCopper(trade, memberId))} Copper และไอเทม`, action: { action: "trade.confirm", tradeId: trade.id, expectedRevision: trade.revision } })}>{ownConfirmed ? "ยืนยันแล้ว · รออีกฝ่าย" : "ยืนยันแลกเปลี่ยน"}</button></> : null}
      {pending ? <button className={styles.primary} disabled={busy} onClick={() => perform({ action: "trade.resume", tradeId: trade.id, expectedRevision: trade.revision })}>ตรวจผลรายการเดิม</button> : null}
      <small>หมดเวลา {date(trade.expiresAt)}</small>
    </footer>
  </article>;
}

function AuctionCard({ auction, snapshot, busy, featured, observedAt, confirm }: { auction: MarketAuction; snapshot: MarketSnapshot; busy: boolean; featured: boolean; observedAt: number; confirm: (value: Confirmation) => void }) {
  const own = auction.sellerId === snapshot.member.discordId, leading = auction.highestBidderId === snapshot.member.discordId;
  const ended = new Date(auction.endsAt).getTime() <= observedAt, open = auction.status === "OPEN", awaiting = auction.status === "AWAITING_AUTHORIZATION";
  const authorizationUrl = businessAuthorizationUrl(auction);
  const { price: nextPrice, priceToHold, charge } = auctionBidCost(auction, snapshot.member.discordId);
  const insufficient = snapshot.wallet.balanceCopper !== null && snapshot.wallet.balanceCopper < charge;
  return <article className={`${styles.auctionCard} ${featured ? styles.featured : ""}`} id={`auction-${auction.id}`}>
    <div className={styles.auctionTop}><ItemArt src={auction.imageUrl} name={auction.itemName} /><div><span className={styles.eyebrow}>{own ? "รายการของคุณ" : leading ? "คุณเป็นผู้เสนอสูงสุด" : "GUILD AUCTION"}</span><h3>{auction.itemName}</h3><p>จำนวน {money(auction.quantity)} ชิ้น</p></div><span className={styles.badge}>{auction.pending ? "กำลังตรวจสอบยอด" : marketStatus[auction.status] ?? auction.status}</span></div>
    <div className={styles.price}><span>ราคาปัจจุบัน</span><strong>{money(auction.currentPriceCopper)} <small>copper</small></strong><span>ยกไม้แล้ว {money(auction.bidCount)} ครั้ง</span></div>
    <p className={styles.muted}>ปิด {date(auction.endsAt)} · ผู้ขาย {auction.sellerId}</p>
    {awaiting ? <div className={styles.pendingNotice}><p>พักไอเทมแล้ว รอผู้ลงนามบัญชีธุรกิจของเซิร์ฟเวอร์อนุมัติรอบนี้ใน ME Coin ยังไม่มีการหัก Copper หรือประกาศเปิดประมูล</p><dl className={styles.authorizationDetails}><dt>รหัสรอบ</dt><dd>{auction.id}</dd><dt>บัญชีธุรกิจ</dt><dd>{auction.businessWalletId}</dd><dt>ผู้ขาย Discord</dt><dd>{auction.sellerId}</dd><dt>ราคาเริ่มต้น</dt><dd>{auction.currentPriceCopper} Copper</dd><dt>เวลาปิดที่ต้องอนุมัติ</dt><dd>{auction.endsAt}</dd></dl>{authorizationUrl ? <a className={styles.secondary} href={authorizationUrl} target="_blank" rel="noopener noreferrer">เปิด ME Coin ให้ผู้ลงนามตรวจและอนุมัติรอบ</a> : null}{!ended ? <button className={styles.primary} disabled={busy} onClick={() => confirm({ title: "ตรวจสิทธิ์และเปิดรอบประมูล", detail: "ระบบจะตรวจว่าผู้ลงนามอนุมัติรอบ ผู้ขาย ราคา และเวลาปิดตรงกันแล้ว จึงเปิดให้ยกไม้และส่งประกาศ", label: "ตรวจสิทธิ์และเปิดประมูล", action: { action: "auction.activate", auctionId: auction.id } })}>ตรวจสิทธิ์หลังผู้ลงนามอนุมัติ</button> : null}</div> : null}
    {auction.highestBidderId ? <p className={styles.muted}>ผู้เสนอสูงสุด {leading ? "คุณ" : auction.highestBidderId}</p> : null}
    {open && !ended && !own ? <>
      <button className={styles.primary} disabled={busy || auction.pending || !snapshot.wallet.configured || insufficient} onClick={() => confirm({ title: `ยกไม้เป็น ${money(nextPrice)} copper`, detail: `${leading ? "เพิ่มเงินที่พักไว้" : "พักเงินราคา"} ${money(priceToHold)} copper และคิดค่ายกไม้ 1 copper รวม ${money(charge)} copper หากถูกแซงจะคืนเฉพาะเงินราคา หากชนะจะได้ค่ายกไม้ทุกครั้งของคุณในรอบนี้คืน`, label: `ยกไม้ · รวม ${money(charge)} copper`, action: { action: "auction.bid", auctionId: auction.id, expectedRevision: auction.revision } })}>{leading ? `เพิ่มราคาเป็น ${money(nextPrice)} · ชำระเพิ่ม 2 copper` : `ยกไม้ ${money(nextPrice)} + ค่าธรรมเนียม 1 copper`}</button>
      {insufficient ? <small className={styles.error}>ยอด copper ไม่พอสำหรับราคาและค่าธรรมเนียม</small> : null}
    </> : null}
    {(open || awaiting) && ended ? <button className={styles.primary} disabled={busy || auction.pending} onClick={() => confirm({ title: "ปิดผลประมูล", detail: "ระบบจะส่งไอเทมให้ผู้ชนะ จ่ายราคาปิดให้ผู้ขาย และคืนค่ายกไม้ของผู้ชนะ หากไม่มีผู้ประมูล ไอเทมจะคืนผู้ขาย", label: "ตรวจผลและปิดประมูล", action: { action: "auction.settle", auctionId: auction.id } })}>ตรวจผลและปิดประมูล</button> : null}
    {own && (open || awaiting) && auction.bidCount === 0 && !auction.pending ? <button className={styles.secondary} disabled={busy} onClick={() => confirm({ title: "ยกเลิกประมูล", detail: "ยังไม่มีผู้ยกไม้ ไอเทมจะกลับเข้ากระเป๋าของคุณ", label: "ยกเลิกและรับของคืน", action: { action: "auction.cancel", auctionId: auction.id } })}>ยกเลิกประมูล</button> : null}
    <Link className={styles.permalink} href={`/adventure/marketplace?guildId=${auction.guildId}&auction=${auction.id}`}>ลิงก์ประมูล #{auction.id.slice(-8)}</Link>
  </article>;
}

export function Marketplace({ initialGuildId, initialAuctionId, initialView, initialComposeAuction }: { initialGuildId: string; initialAuctionId: string; initialView: MarketView; initialComposeAuction: boolean }) {
  const root = useRef<HTMLDivElement>(null), dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<MarketView>(initialView);
  const [composeAuction, setComposeAuction] = useState(initialComposeAuction);
  const [guildId, setGuildId] = useState(initialGuildId), [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "anonymous" | "error">("loading");
  const [observedAt, setObservedAt] = useState(0);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false), [retry, setRetry] = useState<PendingRequest | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const requestBusy = useRef(false), readSequence = useRef(0);
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const sequence = ++readSequence.current;
    const query = new URLSearchParams(); if (guildId) query.set("guildId", guildId); if (initialAuctionId) query.set("auction", initialAuctionId);
    try {
      const response = await fetch(`/api/adventure/marketplace?${query}`, { credentials: "same-origin", cache: "no-store", signal });
      if (signal?.aborted || sequence !== readSequence.current) return;
      if (response.status === 401) { setSnapshot(null); setPhase("anonymous"); return; }
      if (!response.headers.get("Content-Type")?.includes("application/json")) throw new Error("ตลาดยังเชื่อมต่อไม่สำเร็จ กรุณาลองใหม่ภายหลัง");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ยังเปิดตลาดไม่ได้ กรุณาลองใหม่");
      if (!data.member || !Array.isArray(data.inventory) || !Array.isArray(data.trades) || !Array.isArray(data.auctions)) throw new Error("ข้อมูลตลาดยังไม่ครบ กรุณาลองใหม่");
      if (signal?.aborted || sequence !== readSequence.current) return;
      setSnapshot(data); setObservedAt(Date.now()); setPhase("ready"); setError("");
    } catch (failure) {
      if (signal?.aborted || sequence !== readSequence.current) return;
      setError(failure instanceof Error ? failure.message : "เชื่อมต่อตลาดไม่สำเร็จ"); setPhase("error");
    }
  }, [guildId, initialAuctionId]);

  useEffect(() => { const controller = new AbortController(); const initial = window.setTimeout(() => { void refresh(controller.signal); }, 0); const timer = window.setInterval(() => { if (!requestBusy.current && document.visibilityState === "visible") void refresh(controller.signal); }, 10_000); return () => { controller.abort(); window.clearTimeout(initial); window.clearInterval(timer); }; }, [refresh]);
  useEffect(() => { if (!root.current || reducedMotion) return; const scope = createScope({ root }).add(() => { animate("[data-market-reveal]", { opacity: [0, 1], y: [12, 0], duration: 650, ease: "outExpo" }); }); return () => scope.revert(); }, [reducedMotion]);
  useEffect(() => { if (confirmation && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [confirmation]);

  const send = async (operation: PendingRequest) => {
    if (requestBusy.current) return;
    requestBusy.current = true; setBusy(true); setError(""); setNotice(""); setRetry(null);
    try {
      const response = await fetch("/api/adventure/marketplace", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(operation), signal: AbortSignal.timeout(25_000) });
      const body = await response.json();
      if (!response.ok) { if (response.status >= 500) setRetry(operation); throw new Error(body.error || "ทำรายการไม่สำเร็จ กรุณาตรวจข้อมูลล่าสุด"); }
      setNotice(body.result?.pending || (body.result?.status && pendingTrade(body.result)) ? "รับรายการแล้ว กำลังตรวจสอบผลโอนเงิน กรุณารอข้อมูลล่าสุด" : "บันทึกรายการแล้ว ตรวจสถานะล่าสุดได้ด้านล่าง");
      await refresh();
    } catch (failure) {
      if (!(failure instanceof Error) || failure.name === "TimeoutError" || failure.name === "TypeError" || failure instanceof SyntaxError) setRetry(operation);
      setError(failure instanceof Error ? failure.message : "ยังยืนยันผลรายการไม่ได้");
    } finally { requestBusy.current = false; setBusy(false); }
  };
  const perform = (action: MarketAction) => { if (!snapshot?.selectedGuildId || busy || retry) return; void send({ ...action, requestId: crypto.randomUUID(), guildId: snapshot.selectedGuildId }); };
  const disabled = busy || Boolean(retry) || phase !== "ready";
  const confirmationStale = Boolean(confirmation && !tradeConfirmationCurrent(confirmation.action, snapshot?.trades ?? []));
  const loginUrl = marketplaceLoginUrl(snapshot?.selectedGuildId ?? guildId, initialAuctionId, { view: tab, composeAuction: tab === "auctions" && composeAuction });
  const chooseGuild = (value: string) => { setGuildId(value); setSnapshot(null); setPhase("loading"); setNotice(""); setError(""); };
  const createTrade = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); perform({ action: "trade.create", partnerId: String(form.get("partnerId") ?? "").trim() }); };
  const createAuction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const endsAt = new Date(String(form.get("endsAt"))); if (!Number.isFinite(endsAt.getTime()) || endsAt.getTime() <= Date.now()) { setError("เลือกเวลาปิดประมูลในอนาคต"); return; }
    const item = snapshot?.inventory.find((value) => value.itemId === form.get("itemId"));
    const quantity = Number(form.get("quantity")), price = Number(form.get("price"));
    setConfirmation({ title: "เปิดประมูลไอเทม", detail: `${item?.name ?? "ไอเทม"} จำนวน ${quantity} ชิ้น ราคาเริ่ม ${money(price)} copper ปิด ${date(endsAt.toISOString())} ไอเทมจะถูกพักไว้ก่อน ผู้ลงนามบัญชีธุรกิจต้องอนุมัติรอบใน ME Coin แล้วจึงเปิดประมูลและประกาศไปยังห้องเทรด`, label: "เปิดประมูล", action: { action: "auction.create", itemId: form.get("itemId"), quantity, startingPriceCopper: price, endsAt: endsAt.toISOString() } });
  };

  return <div className={styles.page} ref={root}>
    <a className={styles.skipLink} href="#market-main">ข้ามไปเนื้อหา</a>
    <header className={styles.masthead}><Link href="/adventure" className={styles.brand}><GiCompass aria-hidden="true" /><span>Me Guild<small>THE ADVENTURER’S MARKET</small></span></Link><nav aria-label="เมนูตลาด"><Link href="/adventure">กลับหอชุมชน</Link><Link href={loginUrl}>บัญชี Discord</Link></nav></header>
    <main className={styles.content} id="market-main">
      <section className={styles.hero} data-market-reveal><div><p className={styles.eyebrow}>KEEP · EXCHANGE · DISCOVER</p><h1>สัมภาระของคุณ<br /><span>การเดินทางบทต่อไป</span></h1><p>เปิดกระเป๋า แลกของกับสหาย และค้นพบไอเทมจากลานประมูล</p></div><Tilt tiltEnable={!reducedMotion} tiltMaxAngleX={6} tiltMaxAngleY={6} glareEnable={false} className={styles.heroSeal}><GiKnapsack aria-hidden="true" /><span>GUILD MARKET</span><small>ของทุกชิ้น มีเรื่องราว</small></Tilt></section>
      <div className={styles.toolbar}><nav className={styles.tabs} aria-label="ส่วนของตลาด">{([{ id: "inventory", label: "กระเป๋าของฉัน", Icon: GiKnapsack }, { id: "trades", label: "แลกเปลี่ยน", Icon: GiSwapBag }, { id: "auctions", label: "ลานประมูล", Icon: GiHammerDrop }] as const).map(({ id, label, Icon }) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}><Icon aria-hidden="true" />{label}</button>)}</nav>{snapshot?.guilds.length ? <label className={styles.guildSelect}>เซิร์ฟเวอร์<select disabled={busy || Boolean(retry)} value={snapshot.selectedGuildId ?? ""} onChange={(event) => chooseGuild(event.target.value)}>{snapshot.guilds.map((guild) => <option key={guild.id} value={guild.id}>{guild.name}</option>)}</select></label> : null}</div>
      <div aria-live="polite" aria-atomic="true">{notice ? <p className={styles.notice}>{notice}</p> : null}{busy ? <p className={styles.notice}>กำลังบันทึกรายการ กรุณารอสักครู่…</p> : null}</div>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {retry ? <div className={styles.pendingNotice}><p>ยังยืนยันผลรายการก่อนหน้าไม่ได้ กดตรวจรายการเดิมเพื่อป้องกันการตัดเงินหรือส่งของซ้ำ</p><button className={styles.primary} disabled={busy} onClick={() => void send(retry)}>ตรวจรายการเดิมอีกครั้ง</button></div> : null}
      {phase === "loading" ? <section className={styles.gate} aria-busy="true"><GiOpenTreasureChest aria-hidden="true" /><h2>กำลังเปิดกระเป๋า…</h2></section> : null}
      {phase === "anonymous" ? <section className={styles.gate}><GiPadlock aria-hidden="true" /><h2>กระเป๋านี้เป็นของคุณเท่านั้น</h2><p>เข้าสู่ระบบด้วย Discord เพื่อดูไอเทม แลกเปลี่ยน และเข้าร่วมประมูล</p><Link className={styles.primary} href={loginUrl}>เข้าสู่ระบบด้วย Discord</Link></section> : null}
      {phase === "error" ? <section className={styles.gate}><h2>ตลาดยังไม่พร้อมใช้งาน</h2><p>ยังไม่มีการยืนยันรายการใหม่ กรุณาเชื่อมต่ออีกครั้งก่อนทำรายการ</p><button className={styles.secondary} disabled={busy} onClick={() => void refresh()}>โหลดข้อมูลอีกครั้ง</button></section> : null}
      {snapshot && phase === "ready" ? <>
        <div className={styles.accountStrip}><div><span className={styles.eyebrow}>ADVENTURER</span><strong>{snapshot.member.displayName}</strong></div><p><GiTwoCoins aria-hidden="true" /><strong>{snapshot.wallet.balanceCopper === null ? "—" : money(snapshot.wallet.balanceCopper)}</strong> copper <span>พร้อมใช้</span></p><button className={styles.secondary} disabled={busy} onClick={() => void refresh()}>อัปเดตข้อมูล</button></div>
        {!snapshot.selectedGuildId ? <p className={styles.notice}>ยังไม่พบเซิร์ฟเวอร์ที่ใช้งานตลาดได้ กรุณาเข้าร่วมเซิร์ฟเวอร์ Me Guild ด้วยบัญชี Discord นี้</p> : null}
        {tab === "inventory" ? <section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>YOUR COLLECTION</p><h2>กระเป๋าไอเทม</h2></div><span>{snapshot.inventory.length} ชนิดพร้อมใช้</span></div><p className={styles.muted}>จำนวนที่แสดงคือของพร้อมใช้ ไอเทมที่ล็อกแลกหรือเปิดประมูลจะพักไว้นอกกระเป๋าจนรายการจบ</p>{snapshot.inventory.length ? <div className={styles.inventoryGrid}>{snapshot.inventory.map((item) => <article key={item.itemId} className={styles.itemCard}><ItemArt src={item.imageUrl} name={item.name} /><span className={styles.rarity}>{item.rarity ?? "ไอเทม"}</span><h3>{item.name}</h3><p>{item.description || "พร้อมสำหรับการเดินทางครั้งต่อไป"}</p><strong>× {money(item.quantity)}</strong></article>)}</div> : <div className={styles.empty}><GiKnapsack aria-hidden="true" /><h3>กระเป๋ายังว่างอยู่</h3><p>ไอเทมที่ได้รับจะปรากฏที่นี่ หากมีของที่พักไว้ ตรวจได้ในหน้าแลกเปลี่ยนหรือประมูล</p></div>}</section> : null}
        {tab === "trades" ? <section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>A FAIR EXCHANGE</p><h2>แลกเปลี่ยนกับสหาย</h2></div><span>วางของ → ล็อก → ทั้งสองฝ่ายยืนยัน</span></div><div className={styles.ruleStrip}><GiPadlock aria-hidden="true" /><p>หลังล็อกจะแก้ของไม่ได้ ทั้งสองฝ่ายต้องล็อกก่อนยืนยัน และยกเลิกได้ก่อนแลกสำเร็จ</p></div><form className={styles.createTrade} onSubmit={createTrade}><label>Discord ID ของคู่แลก<input name="partnerId" inputMode="numeric" pattern="[0-9]{16,22}" required placeholder="เช่น 123456789012345678" disabled={disabled} /></label><button className={styles.primary} disabled={disabled || !snapshot.selectedGuildId}>เริ่มแลกเปลี่ยน</button></form><div className={styles.tradeList}>{snapshot.trades.length ? snapshot.trades.map((trade) => <TradeCard key={trade.id} trade={trade} snapshot={snapshot} busy={disabled} perform={perform} confirm={setConfirmation} />) : <div className={styles.empty}><GiSwapBag aria-hidden="true" /><h3>ยังไม่มีรายการแลกเปลี่ยน</h3><p>กรอก Discord ID เพื่อเริ่มวางของกับเพื่อนในเซิร์ฟเวอร์เดียวกัน</p></div>}</div></section> : null}
        {tab === "auctions" ? <section><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>THE AUCTION YARD</p><h2>ลานประมูล</h2></div><span>ประมูลผ่านเว็บหน้าบ้านเท่านั้น</span></div><div className={styles.auctionRules}><div><strong>+1 copper</strong><span>ราคาเพิ่มต่อไม้</span></div><div><strong>1 copper</strong><span>ค่ายกไม้แต่ละครั้ง</span></div><p>ผู้ชนะได้ค่ายกไม้ของตนในรอบนี้คืนทั้งหมด ผู้ขายได้รับราคาปิด ส่วนค่ายกไม้ของผู้ไม่ชนะเข้ากระเป๋าธุรกิจของเซิร์ฟเวอร์ที่จัดประมูล</p></div>{!snapshot.wallet.configured ? <p className={styles.notice}>กระเป๋าธุรกิจของเซิร์ฟเวอร์ยังไม่พร้อม ขณะนี้ยังเปิดประมูลหรือยกไม้ไม่ได้</p> : null}<details id="create-auction" className={styles.createAuction} open={composeAuction} onToggle={(event) => setComposeAuction(event.currentTarget.open)}><summary>นำไอเทมของฉันขึ้นประมูล</summary><form onSubmit={createAuction}><fieldset disabled={disabled || !snapshot.wallet.configured || !snapshot.selectedGuildId || !snapshot.inventory.length}><legend>รายละเอียดประมูลใหม่</legend><div className={styles.formGrid}><label>ไอเทม<select name="itemId" required>{snapshot.inventory.map((item) => <option key={item.itemId} value={item.itemId}>{item.name} · มี {item.quantity}</option>)}</select></label><label>จำนวน<input name="quantity" type="number" required min={1} max={1000000} step={1} defaultValue={1} /></label><label>ราคาเริ่มต้น (copper)<input name="price" type="number" required min={0} max={999999} step={1} defaultValue={0} /></label><label>เวลาปิดประมูล (เวลาบนอุปกรณ์)<input name="endsAt" type="datetime-local" required /></label></div><button className={styles.primary}>ตรวจรายการก่อนเปิดประมูล</button></fieldset></form></details><div className={styles.auctionGrid}>{snapshot.auctions.length ? [...snapshot.auctions].sort((left, right) => Number(right.id === initialAuctionId) - Number(left.id === initialAuctionId)).map((auction) => <AuctionCard key={auction.id} auction={auction} snapshot={snapshot} busy={disabled} featured={auction.id === initialAuctionId} observedAt={observedAt} confirm={setConfirmation} />) : <div className={styles.empty}><GiHammerDrop aria-hidden="true" /><h3>ลานประมูลยังเงียบอยู่</h3><p>เมื่อมีผู้เปิดประมูล รายการจะปรากฏที่นี่</p></div>}</div><section className={styles.history}><h2>บันทึก copper ของฉัน</h2>{snapshot.ledger.length ? <div className={styles.tableWrap}><table><thead><tr><th>รายการ</th><th>จำนวน copper</th><th>ประมูล</th><th>เวลา</th></tr></thead><tbody>{snapshot.ledger.map((entry) => <tr key={entry.id}><td>{marketLedgerLabel[entry.kind] ?? entry.kind}</td><td>{money(entry.amountCopper)}</td><td>{entry.auctionId ? `#${entry.auctionId.slice(-8)}` : "—"}</td><td>{date(entry.createdAt)}</td></tr>)}</tbody></table></div> : <p className={styles.muted}>ยังไม่มีการเคลื่อนไหวจากประมูล</p>}</section></section> : null}
      </> : null}
    </main><footer className={styles.footer}>✦ Me Guild · แลกของอย่างมั่นใจ เดินทางไปด้วยกัน</footer>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="market-confirm-title" onClose={() => setConfirmation(null)}><div><p className={styles.eyebrow}>ตรวจรายการอีกครั้ง</p><h2 id="market-confirm-title">{confirmation?.title}</h2><p>{confirmation?.detail}</p>{confirmationStale ? <p role="alert">ข้อเสนอเปลี่ยนแล้ว กรุณากลับไปตรวจไอเทมและ Copper ล่าสุดก่อนยืนยัน</p> : null}<div className={styles.actions}><button className={styles.secondary} autoFocus onClick={() => dialog.current?.close()}>กลับไปตรวจรายการ</button><button className={styles.primary} disabled={disabled || confirmationStale} onClick={() => { if (confirmation && !confirmationStale) perform(confirmation.action); dialog.current?.close(); }}>{confirmation?.label}</button></div></div></dialog>
  </div>;
}
