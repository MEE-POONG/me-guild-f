"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { GiOpenTreasureChest, GiTicket, GiPadlock, GiTwoCoins } from "react-icons/gi";
import { offersEqual, parseTradeCopper, pendingTrade, marketStatus, tradeCopper, tradeOfferSummary, tradeTicketQuantity, type MarketAction, type MarketSnapshot, type MarketTrade } from "@/lib/marketplace-types";
import { invalidTradeQuantities, marketAssetPage, reconcileTradeAssets, tradeAssetLimit, type MarketAsset as Asset } from "@/lib/marketplace-assets";
import styles from "./marketplace.module.css";

export type TradeConfirmation = { title: string; detail: string; label: string; action: MarketAction };
const count = (value: number) => value.toLocaleString("th-TH");

function AssetArt({ asset }: { asset: Asset }) {
  const [failed, setFailed] = useState(false);
  return <span className={styles.assetArt}>{asset.imageUrl && !failed
    ? <Image unoptimized src={asset.imageUrl} alt="" width={56} height={56} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    : asset.ticket ? <GiTicket aria-hidden="true" /> : <GiOpenTreasureChest aria-hidden="true" />}</span>;
}

function assetsOf(snapshot: MarketSnapshot): Asset[] {
  return [
    ...(snapshot.tickets ?? []).filter((ticket) => ticket.guildId === snapshot.selectedGuildId).map((ticket) => ({ key: `ticket:${ticket.guildId}`, name: "ตั๋ว", quantity: ticket.balance, ticket: true })),
    ...snapshot.inventory.map((item) => ({ key: item.itemId, name: item.name, quantity: item.quantity, imageUrl: item.imageUrl })),
  ];
}

export function AssetPicker({ assets, selected = {}, disabled, onPick, label }: {
  assets: Asset[]; selected?: Record<string, number>; disabled?: boolean; onPick?: (asset: Asset) => void; label: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const detail = assets.find(asset => asset.key === detailKey);
  const { filtered, pages, current, shown } = marketAssetPage(assets, query, page);
  return <section aria-label={label} className={styles.assetPicker}>
    <div className={styles.assetTools}><label>ค้นหาไอเทม<input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="ชื่อไอเทมหรือตั๋ว" /></label><span>{filtered.length} ชนิด</span></div>
    <div className={styles.assetGrid}>{shown.map((asset) => <button type="button" key={asset.key} className={`${styles.assetButton} ${selected[asset.key] ? styles.assetSelected : ""}`} aria-label={`${asset.name} ×${count(asset.quantity)}`} aria-pressed={onPick ? Boolean(selected[asset.key]) : detail?.key === asset.key} disabled={disabled || Boolean(onPick && (tradeAssetLimit(asset) <= (selected[asset.key] ?? 0)))} onClick={() => { if (onPick) onPick(asset); else setDetailKey(asset.key); }}>
      <AssetArt asset={asset} /><strong>{asset.name} <span>×{count(asset.quantity)}</span></strong>
      <small>{onPick ? selected[asset.key] ? `เสนอ ${count(selected[asset.key])} · กดเพิ่ม 1` : "กดเพิ่มในข้อเสนอ" : asset.ticket ? "ตั๋วของเซิร์ฟเวอร์นี้" : "ไอเทมสะสมพร้อมใช้"}</small>
    </button>)}</div>
    {!shown.length ? <p className={styles.empty}>{query ? "ไม่พบไอเทมชื่อนี้ ลองค้นหาด้วยคำอื่น" : "ยังไม่มีไอเทมในกระเป๋า ของขวัญที่ได้รับและชำระสำเร็จจะสะสมที่นี่"}</p> : null}
    <nav className={styles.assetPagination} aria-label={`เปลี่ยนหน้า${label}`}><button type="button" className={styles.secondary} disabled={disabled || current === 0} onClick={() => setPage(current - 1)}>ย้อนกลับ</button><span aria-live="polite">หน้า {current + 1} / {pages}</span><button type="button" className={styles.secondary} disabled={disabled || current === pages - 1} onClick={() => setPage(current + 1)}>ถัดไป</button></nav>
    {!onPick && detail ? <p className={styles.assetDetail} role="status"><strong>{detail.name} ×{count(detail.quantity)}</strong> · {detail.ticket ? "ใช้หรือแลกได้ในเซิร์ฟเวอร์ที่ออกตั๋ว" : "เลือกไอเทมนี้จากกระเป๋าเมื่อเปิดรายการแลกเปลี่ยน"}</p> : null}
  </section>;
}

export function Collection({ snapshot }: { snapshot: MarketSnapshot }) {
  return <section><div className={styles.sectionHeading}><h2>กระเป๋าไอเทมสะสม</h2><span>ของพร้อมใช้ในกระเป๋า</span></div><p className={styles.muted}>ไอเทมจากของขวัญที่ชำระสำเร็จจะสะสมให้ผู้รับ ของที่ล็อกแลกหรือเปิดประมูลจะพักไว้นอกกระเป๋า ตั๋วแยกตามเซิร์ฟเวอร์</p><AssetPicker key={snapshot.selectedGuildId} assets={assetsOf(snapshot)} label="กระเป๋าสะสม" /></section>;
}

function draftFor(trade: MarketTrade, memberId: string) {
  return {
    source: trade,
    assets: Object.fromEntries([
      ...(trade.offers[memberId] ?? []).map((item) => [item.itemId, { key: item.itemId, name: item.name, quantity: item.quantity }]),
      [`ticket:${trade.guildId}`, { key: `ticket:${trade.guildId}`, name: "ตั๋ว", quantity: tradeTicketQuantity(trade, memberId), ticket: true }],
    ]) as Record<string, Asset>,
    quantities: Object.fromEntries([
      ...(trade.offers[memberId] ?? []).map((item) => [item.itemId, String(item.quantity)]),
      [`ticket:${trade.guildId}`, String(tradeTicketQuantity(trade, memberId))],
    ]) as Record<string, string>,
    copper: String(tradeCopper(trade, memberId)),
  };
}

function OfferEditor({ trade, snapshot, busy, perform, confirm }: {
  trade: MarketTrade; snapshot: MarketSnapshot; busy: boolean; perform: (action: MarketAction) => void; confirm: (value: TradeConfirmation) => void;
}) {
  const memberId = snapshot.member.discordId;
  const [draft, setDraft] = useState(() => draftFor(trade, memberId));
  const ticketKey = `ticket:${trade.guildId}`;
  const copper = parseTradeCopper(draft.copper);
  const tickets = parseTradeCopper(draft.quantities[ticketKey] ?? "0");
  const available = assetsOf(snapshot);
  const choices = reconcileTradeAssets(available, draft.quantities, draft.assets);
  const values = Object.fromEntries(Object.entries(draft.quantities).map(([key, value]) => [key, parseTradeCopper(value)]));
  const selected = choices.filter((asset) => draft.quantities[asset.key] !== undefined && draft.quantities[asset.key] !== "0");
  const invalid = copper === null || tickets === null || invalidTradeQuantities(draft.quantities, available);
  const items = Object.entries(values).filter(([key, quantity]) => key !== ticketKey && quantity !== null && quantity > 0).map(([itemId, quantity]) => ({ itemId, quantity: quantity! }));
  const sameAs = (other: MarketTrade) => offersEqual(items, other.offers[memberId] ?? []) && copper === tradeCopper(other, memberId) && tickets === tradeTicketQuantity(other, memberId);
  const dirty = invalid || !sameAs(draft.source);
  const stale = trade.revision !== draft.source.revision;
  // Refresh a clean editor or our acknowledged save, but keep unsaved edits
  // visible when the other participant changes the revision.
  if (stale && (!dirty || (!invalid && sameAs(trade)))) setDraft(draftFor(trade, memberId));
  const reset = () => setDraft(draftFor(trade, memberId));
  return <div className={styles.offerEditor}>
    {stale && dirty ? <p className={styles.pendingNotice} role="status">อีกฝ่ายเปลี่ยนรายการแล้ว แบบร่างของคุณยังอยู่ ตรวจข้อเสนอล่าสุดก่อนเริ่มเลือกใหม่ <button type="button" className={styles.secondary} disabled={busy} onClick={reset}>ใช้รายการล่าสุดและล้างแบบร่าง</button></p> : null}
    <form onSubmit={(event) => { event.preventDefault(); if (invalid || stale || items.length > 20) return; perform({ action: "trade.offer", tradeId: trade.id, expectedRevision: draft.source.revision, items, copper, tickets: tickets ? [{ guildId: trade.guildId, quantity: tickets }] : [] }); }}>
      <fieldset disabled={busy || stale}><legend>เลือกของจากกระเป๋าใส่ข้อเสนอ</legend><p className={styles.muted}>กดไอเทมเพื่อเพิ่มครั้งละ 1 แล้วปรับจำนวนด้านล่าง เลือกไอเทมได้ไม่เกิน 20 ชนิด</p>
        <AssetPicker assets={choices} selected={Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ?? 0]))} disabled={busy || stale} label="เลือกของแลกเปลี่ยน" onPick={(asset) => setDraft((previous) => ({ ...previous, assets: { ...previous.assets, [asset.key]: asset }, quantities: { ...previous.quantities, [asset.key]: String(Math.min(tradeAssetLimit(asset), (parseTradeCopper(previous.quantities[asset.key] ?? "0") ?? 0) + 1)) } }))} />
        {selected.length ? <div className={styles.selectedItems}><h4>ของที่เลือก</h4>{selected.map((asset) => <div className={styles.quantityRow} key={asset.key}><label htmlFor={`${trade.id}-${asset.key}`}>{asset.name}<small>มี {count(asset.quantity)} · ใส่ 0 เพื่อนำออก</small></label><div className={styles.quantityControls}><input id={`${trade.id}-${asset.key}`} aria-label={`จำนวน ${asset.name}`} type="text" inputMode="numeric" required maxLength={9} aria-invalid={values[asset.key] === null || values[asset.key]! > asset.quantity} value={draft.quantities[asset.key]} onChange={(event) => setDraft({ ...draft, quantities: { ...draft.quantities, [asset.key]: event.target.value } })} /><button type="button" className={styles.removeAsset} aria-label={`นำ ${asset.name} ออก`} onClick={() => setDraft({ ...draft, quantities: { ...draft.quantities, [asset.key]: "0" } })}>นำออก</button></div></div>)}</div> : null}
        <label className={styles.quantityRow}><span>Copper ที่เสนอ<small>จำนวนเต็ม 0–1,000,000 เช่น 1000 หรือ 1,000</small></span><input aria-label="Copper ที่เสนอ" type="text" inputMode="numeric" maxLength={9} required aria-invalid={copper === null} value={draft.copper} onChange={(event) => setDraft({ ...draft, copper: event.target.value })} /></label>
        {invalid ? <p className={styles.error} role="alert">ใส่จำนวนเต็ม 0–1,000,000 และไม่เกินของที่มีในกระเป๋า</p> : null}
        {items.length > 20 ? <p className={styles.error} role="alert">เลือกไอเทมได้ไม่เกิน 20 ชนิดต่อรายการ</p> : null}
        <button type="submit" className={styles.secondary} disabled={!dirty || invalid || items.length > 20}>บันทึกข้อเสนอ</button>
      </fieldset>
    </form>
    <button className={styles.primary} disabled={busy || dirty || stale || (!(trade.offers[memberId] ?? []).length && !tradeTicketQuantity(trade, memberId) && !tradeCopper(trade, memberId))} onClick={() => confirm({ title: "ตรวจของก่อนยืนยันข้อเสนอ", detail: `${tradeOfferSummary(trade, memberId)} • เมื่อยืนยัน จะพักของ ตั๋ว และ Copper ของคุณไว้จนแลกสำเร็จหรือยกเลิก`, label: "ยืนยันข้อเสนอและล็อกของ", action: { action: "trade.lock", tradeId: trade.id, expectedRevision: trade.revision } })}><GiPadlock aria-hidden="true" />ยืนยันข้อเสนอ</button>
    {dirty ? <small>บันทึกของที่เลือกก่อนยืนยันข้อเสนอ</small> : null}
  </div>;
}

export function TradeCard({ trade, snapshot, busy, perform, confirm, featured }: {
  trade: MarketTrade; snapshot: MarketSnapshot; busy: boolean; perform: (action: MarketAction) => void; confirm: (value: TradeConfirmation) => void; featured?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState("");
  const memberId = snapshot.member.discordId;
  const ownLocked = trade.lockedIds.includes(memberId), ownConfirmed = trade.confirmedIds.includes(memberId);
  const bothLocked = trade.participantIds.every((id) => trade.lockedIds.includes(id));
  const open = trade.status === "OPEN";
  const summary = tradeOfferSummary(trade, memberId);
  const invite = trade.invitation?.state;
  const invitationText = { queued: "คำเชิญรอส่ง · ส่งลิงก์รายการให้อีกฝ่ายเพื่อเริ่มได้", sent: "ส่งคำเชิญทาง DM แล้ว", failed: "ส่ง DM ไม่สำเร็จ · ส่งลิงก์รายการให้อีกฝ่าย", uncertain: "ยังยืนยันผลส่ง DM ไม่ได้ · ส่งลิงก์รายการให้อีกฝ่าย", cancelled: "หยุดส่งคำเชิญสำหรับรายการนี้แล้ว" };
  const href = `/adventure/marketplace?guildId=${trade.guildId}&view=trades&trade=${trade.id}`;
  return <article className={`${styles.tradeCard} ${featured ? styles.featuredTrade : ""}`} id={`trade-${trade.id}`} aria-label={`รายการแลกเปลี่ยน ${trade.id.slice(-8)}`}>
    <header className={styles.cardHeading}><div><h3>แลกเปลี่ยนกับ {trade.participantIds.find((id) => id !== memberId)}</h3><p className={styles.muted}>รายการ #{trade.id.slice(-8)} · อัปเดตทุก 10 วินาที</p></div><span className={styles.badge}>{marketStatus[trade.status] ?? trade.status}</span></header>
    <div className={styles.tradeProgress} aria-label="ขั้นตอนแลกเปลี่ยน"><span>1 เลือกของ</span><span className={ownLocked ? styles.stepDone : ""}>2 ยืนยันทั้งคู่</span><span className={trade.status === "COMPLETED" ? styles.stepDone : ""}>3 แลกสำเร็จ</span></div>
    <div className={styles.offerSides}>{trade.participantIds.map((id) => <section key={id} className={trade.lockedIds.includes(id) ? styles.lockedSide : styles.offerSide}>
      <h4>{id === memberId ? "คุณเสนอ" : "อีกฝ่ายเสนอ"}<span>{trade.confirmedIds.includes(id) ? "กดแลกแล้ว" : trade.lockedIds.includes(id) ? "ยืนยันของแล้ว" : "กำลังเลือกของ"}</span></h4>
      <p className={styles.offerCopper}><GiTwoCoins aria-hidden="true" /><strong>{count(tradeCopper(trade, id))} Copper</strong></p>
      <ul>{tradeTicketQuantity(trade, id) ? <li><span>ตั๋ว</span><strong>×{count(tradeTicketQuantity(trade, id))}</strong></li> : null}{(trade.offers[id] ?? []).map((item) => <li key={item.itemId}><span>{item.name}</span><strong>×{count(item.quantity)}</strong></li>)}</ul>
      {!(trade.offers[id] ?? []).length && !tradeTicketQuantity(trade, id) ? <p className={styles.muted}>ยังไม่มีไอเทมหรือตั๋วในข้อเสนอ</p> : null}
    </section>)}</div>
    {open && !ownLocked ? <OfferEditor key={trade.id} trade={trade} snapshot={snapshot} busy={busy} perform={perform} confirm={confirm} /> : null}
    {open && ownLocked ? <p className={styles.lockNote}><GiPadlock aria-hidden="true" />{bothLocked ? "ทั้งคู่ยืนยันของแล้ว ตรวจข้อเสนอทั้งสองฝั่งแล้วกดแลก" : "พักข้อเสนอของคุณแล้ว รออีกฝ่ายยืนยันของ"}</p> : null}
    {pendingTrade(trade) ? <p className={styles.pendingNotice} role="status">ระบบกำลังตรวจผลรายการเดิม กรุณารอหรือตรวจผลอีกครั้ง</p> : null}
    <footer className={styles.actions}>
      {open ? <><button className={styles.secondary} disabled={busy} onClick={() => confirm({ title: "ยกเลิกรายการแลกเปลี่ยน", detail: `${summary} • ของ ตั๋ว และ Copper ที่พักไว้จะคืนเจ้าของเมื่อยกเลิกสำเร็จ`, label: "ยกเลิกรายการนี้", action: { action: "trade.cancel", tradeId: trade.id, expectedRevision: trade.revision } })}>ยกเลิกรายการ</button><button className={styles.primary} disabled={busy || !bothLocked || ownConfirmed} onClick={() => confirm({ title: "ตรวจรายการก่อนแลก", detail: `${summary} • ส่งมอบเมื่อทั้งสองฝ่ายกดแลกครบ`, label: "ยืนยันแลกของตามรายการ", action: { action: "trade.confirm", tradeId: trade.id, expectedRevision: trade.revision } })}>{ownConfirmed ? "กดแลกแล้ว · รออีกฝ่าย" : "แลก"}</button></> : null}
      {pendingTrade(trade) ? <button className={styles.primary} disabled={busy} onClick={() => perform({ action: "trade.resume", tradeId: trade.id, expectedRevision: trade.revision })}>ตรวจผลรายการเดิม</button> : null}
      <small>หมดเวลา {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(trade.expiresAt))}</small>
    </footer>
    <div className={styles.tradeLink}><span>{invite ? invitationText[invite] : "อีกฝ่ายเปิดรายการนี้จากกระเป๋าของตนเองได้"}</span><div className={styles.linkActions}><Link href={href}>เปิดลิงก์รายการนี้</Link><button type="button" className={styles.secondary} onClick={async () => { const url = new URL(href, window.location.origin).href; try { await navigator.clipboard.writeText(url); setCopied(true); setCopyFallback(""); } catch { setCopyFallback(url); } }}>{copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์ให้คู่แลก"}</button></div>{copyFallback ? <label>คัดลอกลิงก์นี้ส่งให้คู่แลก<input readOnly value={copyFallback} onFocus={(event) => event.target.select()} /></label> : null}</div>
  </article>;
}
