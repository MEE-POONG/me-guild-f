"use client";

import { useEffect, useRef, useState } from "react";
import { GiCheckMark, GiCompass, GiCrown, GiLaurels, GiOpenBook, GiPadlock, GiRoundStar, GiShield, GiSparkles } from "react-icons/gi";
import styles from "./achievement-book.module.css";

type AchievementIcon = "star" | "book" | "shield" | "spark" | "crown";
type AchievementRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
type AchievementCondition = "VERIFIED_PARTICIPATION" | "STAFF_APPROVAL";
type EarnedAchievement = {
  id: string;
  definitionId: string;
  campaignId: string;
  campaignTitle: string;
  name: string;
  description: string;
  icon: AchievementIcon;
  rarity: AchievementRarity;
  condition: AchievementCondition;
  earnedAt: string;
  awardedBy: "participation" | "staff";
};
type BookEntry = Omit<EarnedAchievement, "earnedAt" | "awardedBy"> & {
  earnedAt?: string;
  awardedBy?: "participation" | "staff";
  previewStatus?: "EARNED" | "LOCKED" | "PROGRESS";
  progress?: number;
};
type Pagination = { page?: number; pageSize?: number; total?: number; totalPages?: number; hasMore?: boolean };
type BookPayload = { achievements: EarnedAchievement[]; pagination?: Pagination; awarded?: number; existing?: number; nextCursor?: string | null };
type LoadState = "demo" | "loading" | "ready" | "anonymous" | "error";
const rarityLabels: Record<AchievementRarity, string> = { COMMON: "ทั่วไป", RARE: "หายาก", EPIC: "มหากาพย์", LEGENDARY: "ตำนาน" };
const conditionLabels: Record<AchievementCondition, string> = { VERIFIED_PARTICIPATION: "ยืนยันเข้าร่วมกิจกรรม", STAFF_APPROVAL: "ทีมงานอนุมัติความสำเร็จ" };
const iconComponents = { star: GiRoundStar, book: GiOpenBook, shield: GiShield, spark: GiSparkles, crown: GiCrown };
const previewEntries: BookEntry[] = [
  { id: "demo-first-light", definitionId: "demo-first-light", campaignId: "demo-campfire", campaignTitle: "คืนเล่าเรื่องข้างกองไฟ · กิจกรรมตัวอย่าง", name: "แสงแรกแห่งมิตรภาพ", description: "ตัวอย่างตราสำหรับผู้เข้าร่วมกิจกรรมพบเพื่อนร่วมทางครั้งแรก", icon: "star", rarity: "COMMON", condition: "VERIFIED_PARTICIPATION", previewStatus: "EARNED" },
  { id: "demo-library", definitionId: "demo-library", campaignId: "demo-library", campaignTitle: "ห้องสมุดนักเดินทาง · กิจกรรมตัวอย่าง", name: "ผู้ส่งต่อประกายความรู้", description: "ตัวอย่างตราที่ทีมงานอนุมัติเมื่อสมาชิกแบ่งปันความรู้ตามเงื่อนไขกิจกรรม", icon: "book", rarity: "RARE", condition: "STAFF_APPROVAL", previewStatus: "PROGRESS", progress: 50 },
  { id: "demo-guardian", definitionId: "demo-guardian", campaignId: "demo-guardian", campaignTitle: "ภารกิจสหายร่วมทาง · กิจกรรมตัวอย่าง", name: "โล่แห่งสหาย", description: "ตัวอย่างตราจากกิจกรรมช่วยเหลือเพื่อนร่วมกลุ่ม โดยใช้หลักฐานการเข้าร่วมที่ตรวจสอบแล้ว", icon: "shield", rarity: "EPIC", condition: "VERIFIED_PARTICIPATION", previewStatus: "LOCKED" },
  { id: "demo-legend", definitionId: "demo-legend", campaignId: "demo-legend", campaignTitle: "ตำนานแห่ง Me Guild · กิจกรรมตัวอย่าง", name: "ผู้เขียนตำนานบทใหม่", description: "ตัวอย่างตราสำหรับความสำเร็จพิเศษที่ต้องผ่านการพิจารณาจากทีมงาน", icon: "crown", rarity: "LEGENDARY", condition: "STAFF_APPROVAL", previewStatus: "LOCKED" },
];

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

function validEntry(value: unknown): value is EarnedAchievement {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<EarnedAchievement>;
  return typeof entry.id === "string" && typeof entry.definitionId === "string" && typeof entry.campaignId === "string" && typeof entry.campaignTitle === "string" && typeof entry.name === "string" && typeof entry.description === "string" && Boolean(entry.icon && Object.hasOwn(iconComponents, entry.icon)) && Boolean(entry.rarity && Object.hasOwn(rarityLabels, entry.rarity)) && Boolean(entry.condition && Object.hasOwn(conditionLabels, entry.condition)) && typeof entry.earnedAt === "string" && Number.isFinite(new Date(entry.earnedAt).getTime()) && (entry.awardedBy === "staff" || entry.awardedBy === "participation");
}

function entryStatus(entry: BookEntry) {
  return entry.previewStatus === "LOCKED" ? "ยังไม่ปลดล็อก · ตัวอย่าง" : entry.previewStatus === "PROGRESS" ? "กำลังสะสมเรื่องราว · ตัวอย่าง" : entry.previewStatus === "EARNED" ? "ปลดล็อกแล้ว · ตัวอย่าง" : "ได้รับความสำเร็จแล้ว";
}

export function AchievementBook({ onProgressionRefresh }: { onProgressionRefresh?: () => Promise<void> } = {}) {
  const [state, setState] = useState<LoadState>("demo");
  const [entries, setEntries] = useState<EarnedAchievement[]>([]);
  const [rarity, setRarity] = useState<AchievementRarity | "ALL">("ALL");
  const [condition, setCondition] = useState<AchievementCondition | "ALL">("ALL");
  const [selected, setSelected] = useState<BookEntry | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncCursor, setSyncCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({ page: 1 });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const sourceEntries: BookEntry[] = state === "demo" ? previewEntries : entries;
  const visibleEntries = sourceEntries.filter((entry) => (rarity === "ALL" || entry.rarity === rarity) && (condition === "ALL" || entry.condition === condition));
  const hasMore = pagination.hasMore === true || Boolean(pagination.totalPages && (pagination.page ?? 1) < pagination.totalPages) || Boolean(pagination.total && entries.length < pagination.total);

  useEffect(() => () => controllerRef.current?.abort(), []);
  useEffect(() => {
    if (selected && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    if (!selected && dialogRef.current?.open) dialogRef.current.close();
  }, [selected]);

  const loadBook = async (nextPage = 1) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (nextPage === 1) { setState("loading"); setEntries([]); setNotice(""); }
    else setLoadingMore(true);
    setError("");
    try {
      const response = await fetch(`/api/adventure/achievements?page=${nextPage}&pageSize=20`, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
      if (controller.signal.aborted) return;
      if (response.status === 401) { setState("anonymous"); setEntries([]); return; }
      if (!response.ok) throw new Error("service");
      const payload = await response.json() as BookPayload;
      if (!Array.isArray(payload.achievements) || !payload.achievements.every(validEntry)) throw new Error("shape");
      if (controller.signal.aborted) return;
      setEntries((previous) => nextPage === 1 ? payload.achievements : [...previous, ...payload.achievements.filter((entry) => !previous.some((existing) => existing.id === entry.id))]);
      setPagination({ page: nextPage, ...payload.pagination });
      setState("ready");
    } catch {
      if (!controller.signal.aborted) {
        setError("ยังเปิดสมุดความสำเร็จไม่ได้ ลองอีกครั้งเมื่อบริการพร้อม");
        if (nextPage === 1) setState("error");
      }
    } finally { if (!controller.signal.aborted) setLoadingMore(false); }
  };

  const syncAchievements = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setSyncing(true);
    setError("");
    setNotice("");
    let proofChecked = false;
    try {
      const response = await fetch("/api/adventure/achievements/sync", { method: "POST", cache: "no-store", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(syncCursor ? { cursor: syncCursor } : {}), signal: controller.signal });
      if (controller.signal.aborted) return;
      if (response.status === 401) { setState("anonymous"); setEntries([]); setSyncCursor(null); return; }
      if (!response.ok) throw new Error("service");
      const payload = await response.json() as BookPayload;
      if (!Array.isArray(payload.achievements) || !payload.achievements.every(validEntry)) throw new Error("shape");
      if (controller.signal.aborted) return;
      proofChecked = true;
      const nextCursor = typeof payload.nextCursor === "string" ? payload.nextCursor : null;
      setSyncCursor(nextCursor);
      const collectionResponse = await fetch("/api/adventure/achievements?page=1&pageSize=20", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
      if (controller.signal.aborted) return;
      if (collectionResponse.status === 401) { setState("anonymous"); setEntries([]); setSyncCursor(null); return; }
      if (!collectionResponse.ok) throw new Error("collection");
      const collection = await collectionResponse.json() as BookPayload;
      if (!Array.isArray(collection.achievements) || !collection.achievements.every(validEntry)) throw new Error("shape");
      if (controller.signal.aborted) return;
      setEntries(collection.achievements);
      setPagination({ page: 1, ...collection.pagination });
      setState("ready");
      const result = payload.awarded ? `พบความสำเร็จใหม่ ${payload.awarded} รายการจากหลักฐานกิจกรรม` : "ยังไม่มีความสำเร็จใหม่จากหลักฐานในชุดนี้";
      setNotice(`${result} · ${nextCursor ? "ยังมีรายการให้ตรวจต่อ กดตรวจหน้าถัดไป" : "ตรวจครบรายการในรอบนี้แล้ว"}`);
      await onProgressionRefresh?.();
    } catch { if (!controller.signal.aborted) setError(proofChecked ? "ตรวจหลักฐานแล้ว แต่ยังโหลดสมุดล่าสุดไม่ได้ กรุณากดโหลดสมุดใหม่" : "ยังตรวจความสำเร็จจากกิจกรรมไม่ได้ ไม่มีการเพิ่มตราจากปุ่มในหน้าเว็บเพียงอย่างเดียว"); }
    finally { if (!controller.signal.aborted) setSyncing(false); }
  };

  const signInMember = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setSigningIn(true);
    setError("");
    try {
      const csrfResponse = await fetch("/api/adventure/member-auth/csrf", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
      const csrf = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("csrf");
      const response = await fetch("/api/adventure/member-auth/signin/discord", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: `${window.location.origin}/adventure?community=achievements#community`, json: "true" }), signal: controller.signal });
      const payload = await response.json() as { url?: string };
      if (!response.ok || !payload.url) throw new Error("signin");
      const destination = new URL(payload.url, window.location.origin);
      if (destination.origin !== window.location.origin && destination.origin !== "https://discord.com") throw new Error("redirect");
      if (controller.signal.aborted) return;
      window.location.assign(destination.toString());
    } catch { if (!controller.signal.aborted) { setError("ยังเริ่มเข้าสู่ระบบสมาชิกไม่ได้ กรุณาลองใหม่เมื่อบริการพร้อม"); setSigningIn(false); } }
  };

  const showDemo = () => {
    controllerRef.current?.abort();
    setState("demo"); setError(""); setNotice(""); setRarity("ALL"); setCondition("ALL"); setSyncCursor(null);
  };

  return <section className={styles.book} aria-labelledby="achievement-book-title">
    <header className={styles.heading}><span className={styles.bookMark}><GiLaurels aria-hidden="true" /></span><div><h3 id="achievement-book-title">สมุดความสำเร็จ</h3><p>ทุกก้าวที่ผ่านไป ทิ้งประกายไว้ในเรื่องราวของคุณ</p></div></header>
    <div className={styles.sourceBar}><div><strong>{state === "demo" ? "กำลังเปิดสมุดตัวอย่าง" : "สมุดความสำเร็จของฉัน"}</strong><span>{state === "demo" ? "ตราและความคืบหน้าด้านล่างเป็นเรื่องราวสมมติสำหรับทดลองหน้าจอ" : "แสดงเฉพาะประวัติความสำเร็จที่ระบบยืนยันให้สมาชิกคนนี้"}</span></div><div className={styles.sourceActions}>{state === "demo" ? <button className={styles.primary} type="button" onClick={() => loadBook()}>เปิดสมุดความสำเร็จของฉัน <GiOpenBook aria-hidden="true" /></button> : <button className={styles.secondary} type="button" disabled={syncing} onClick={showDemo}>กลับไปดูสมุดตัวอย่าง</button>}{state === "ready" ? <><button className={styles.secondary} type="button" disabled={syncing || loadingMore} onClick={() => loadBook()}>โหลดสมุดใหม่</button><button className={styles.primary} type="button" disabled={syncing || loadingMore} onClick={syncAchievements}>{syncing ? "กำลังตรวจหลักฐานกิจกรรม…" : syncCursor ? "ตรวจหน้าถัดไป" : "ตรวจความสำเร็จจากกิจกรรม"}<GiCompass aria-hidden="true" /></button></> : null}</div></div>
    {state === "loading" ? <div className={styles.statePanel} role="status"><GiCompass aria-hidden="true" /><h4>กำลังเปิดบันทึกการเดินทาง…</h4><p>ตรวจสมาชิกก่อนอ่านความสำเร็จของคุณ</p></div> : null}
    {state === "anonymous" ? <div className={styles.statePanel}><GiPadlock aria-hidden="true" /><h4>สมุดเล่มนี้เปิดให้เจ้าของเรื่องราวเท่านั้น</h4><p>เข้าสู่ระบบสมาชิกด้วย Discord เพื่อดูความสำเร็จที่ได้รับจริง</p><button className={styles.primary} type="button" disabled={signingIn} onClick={signInMember}>{signingIn ? "กำลังเปิดประตู…" : "เข้าสู่ระบบสมาชิกด้วย Discord"}</button></div> : null}
    {state === "error" ? <div className={styles.statePanel}><GiOpenBook aria-hidden="true" /><h4>สมุดยังเปิดไม่ได้ในขณะนี้</h4><p>ข้อมูลตัวอย่างจะไม่ถูกใช้แทนประวัติความสำเร็จจริง</p><button className={styles.primary} type="button" onClick={() => loadBook()}>ลองเปิดสมุดอีกครั้ง</button></div> : null}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {notice ? <p className={styles.notice} role="status"><GiCheckMark aria-hidden="true" />{notice}</p> : null}
    {state === "demo" || state === "ready" ? <>
      <div className={styles.filters}><label>ระดับความหายาก<select value={rarity} onChange={(event) => setRarity(event.target.value as AchievementRarity | "ALL")}><option value="ALL">ทุกระดับ</option>{Object.entries(rarityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>เงื่อนไขความสำเร็จ<select value={condition} onChange={(event) => setCondition(event.target.value as AchievementCondition | "ALL")}><option value="ALL">ทุกเงื่อนไข</option>{Object.entries(conditionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span aria-live="polite">{state === "demo" ? `${visibleEntries.length} รายการตัวอย่าง` : `แสดง ${visibleEntries.length} รายการที่โหลดแล้ว`}</span></div>
      <div className={styles.collection}>{visibleEntries.map((entry) => {
        const Icon = iconComponents[entry.icon];
        const locked = entry.previewStatus === "LOCKED";
        return <article key={entry.id} className={`${styles.achievement} ${styles[entry.rarity.toLowerCase()]} ${locked ? styles.locked : ""}`}><span className={styles.emblem}><Icon aria-hidden="true" />{locked ? <GiPadlock className={styles.lockSymbol} aria-hidden="true" /> : null}</span><header><span className={styles.rarity}>{rarityLabels[entry.rarity]}</span><h4>{entry.name}</h4></header><p>{entry.description}</p><div className={styles.cardCondition}><GiCompass aria-hidden="true" />{conditionLabels[entry.condition]}</div>{entry.previewStatus === "PROGRESS" ? <div className={styles.progress}><label htmlFor={`achievement-progress-${entry.id}`}>ความคืบหน้าตัวอย่าง <b>{entry.progress}%</b></label><progress id={`achievement-progress-${entry.id}`} max={100} value={entry.progress} /></div> : null}<footer><span>{entryStatus(entry)}</span><button type="button" onClick={() => setSelected(entry)} aria-label={`ดูรายละเอียด ${entry.name}`}>ดูรายละเอียด <span aria-hidden="true">↗</span></button></footer></article>;
      })}</div>
      {!visibleEntries.length ? <div className={styles.statePanel}><GiSparkles aria-hidden="true" /><h4>{entries.length ? "ยังไม่มีตราที่ตรงกับตัวกรองนี้" : "เรื่องราวแห่งความสำเร็จของคุณยังรอให้เริ่มต้น"}</h4><p>{entries.length ? "ลองเลือกความหายากหรือเงื่อนไขอื่น" : "เข้าร่วมกิจกรรมตามเงื่อนไข แล้วตรวจหลักฐานเพื่อบันทึกความสำเร็จ หรือรอทีมงานอนุมัติสำหรับตราประเภทพิเศษ"}</p></div> : null}
      {state === "ready" && hasMore ? <button className={styles.loadMore} type="button" disabled={loadingMore || syncing} onClick={() => loadBook((pagination.page ?? 1) + 1)}>{loadingMore ? "กำลังเปิดหน้าถัดไป…" : "โหลดความสำเร็จเพิ่มเติม"}</button> : null}
    </> : null}
    <p className={styles.ruleNote}><GiShield aria-hidden="true" /><span>การสร้างหรือเผยแพร่ตราไม่ได้มอบความสำเร็จทันที สมาชิกต้องมีหลักฐานเข้าร่วมกิจกรรมที่ยืนยันแล้ว หรือได้รับอนุมัติจากทีมงานตามเงื่อนไขของตรา</span></p>
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="achievement-detail-title" onClose={() => { if (!dialogRef.current?.open) setSelected(null); }}><header className={styles.dialogHeading}><div><GiOpenBook aria-hidden="true" /><h4 id="achievement-detail-title">บันทึกความสำเร็จ</h4></div><form method="dialog"><button type="submit" aria-label="ปิดรายละเอียดความสำเร็จ" autoFocus>×</button></form></header>{selected ? <div className={styles.detail}><span className={`${styles.detailEmblem} ${styles[selected.rarity.toLowerCase()]}`}>{(() => { const Icon = iconComponents[selected.icon]; return <Icon aria-hidden="true" />; })()}</span><span className={styles.rarity}>{rarityLabels[selected.rarity]}{selected.previewStatus ? " · ตัวอย่าง" : ""}</span><h5>{selected.name}</h5><p>{selected.description}</p><dl><div><dt>กิจกรรม</dt><dd>{selected.campaignTitle}</dd></div><div><dt>เงื่อนไข</dt><dd>{conditionLabels[selected.condition]}</dd></div><div><dt>สถานะ</dt><dd>{entryStatus(selected)}</dd></div>{selected.earnedAt ? <div><dt>ได้รับเมื่อ</dt><dd>{dateLabel(selected.earnedAt)}</dd></div> : null}{selected.awardedBy ? <div><dt>บันทึกจาก</dt><dd>{selected.awardedBy === "staff" ? "การอนุมัติของทีมงาน" : "หลักฐานการเข้าร่วมกิจกรรม"}</dd></div> : null}</dl><p className={styles.detailNote}>{selected.previewStatus ? "ตัวอย่างนี้ไม่มีประวัติการรับตราจริง และไม่เพิ่มความสำเร็จให้สมาชิก" : "ประวัติความสำเร็จนี้มาจากข้อมูลที่ตรวจสอบบนเซิร์ฟเวอร์ ไม่สามารถเพิ่มซ้ำด้วยปุ่มในหน้าเว็บ"}</p></div> : null}</dialog>
  </section>;
}
