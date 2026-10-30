"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./organization-wallets.module.css";

type Kind = "GUILD" | "DISCORD_SERVER";
type Ref = { kind: Kind; externalId: string };
type Item = Ref & { name: string; status: string };
type Entry = { id: string; direction: string; amountCopper: string; reference: string; description: string; postedAt: string; actorDiscordId: string | null };
type Motion = { id: string; action: string; targetDiscordId: string; reason: string; status: string; electorate: string[]; approvedBy: string[]; expiresAt: string };
type Closure = { id: string; recipientName: string; amountCopper: string; status: string; reason: string; decisionNote?: string };
type Detail = { organization: Item & { balanceCopper: string; reservedCopper: string; entries: Entry[]; nextCursor: string | null; closures: Closure[] }; actorDiscordId: string; managerIds: string[]; committeeIds: string[]; motions: Motion[] };
type Package = { id: string; type: string; name: string; priceCopper: number; durationDays: number };
type Pending = { key: string; ref: Ref; actor: string; body: Record<string, unknown>; summary: string; attempted: boolean; done?: boolean; result?: string };
const labels: Record<string, string> = { GUILD: "กิลด์", DISCORD_SERVER: "Discord server", PERSONAL: "บัญชีส่วนตัว", ACTIVE: "พร้อมใช้งาน", PAUSED: "พักรับและจ่าย", CLOSING: "ระงับยอด · รอปิดบัญชี", CLOSED: "ปิดแล้ว", PENDING: "รอดำเนินการ", APPROVED: "อนุมัติ", REJECTED: "ไม่อนุมัติ", EXPIRED: "หมดเวลา", CANCELLED: "ยกเลิกเพราะข้อมูลเปลี่ยน" };
const money = (value: string | number) => BigInt(value).toLocaleString("th-TH") + " Copper";
const query = (ref: Ref, extra?: Record<string, string>) => "?" + new URLSearchParams({ kind: ref.kind, id: ref.externalId, ...extra });
class OperationError extends Error {
  constructor(message: string, readonly code?: string) { super(message); }
}
async function api<T>(suffix = "", body?: Record<string, unknown>, key?: string): Promise<T> {
  const response = await fetch("/api/organization-wallets" + suffix, {
    method: body ? "POST" : "GET", cache: "no-store", credentials: "same-origin",
    headers: body ? { "content-type": "application/json", "idempotency-key": key ?? crypto.randomUUID() } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    const failure = result && typeof result === "object" ? result as { error?: unknown; code?: unknown } : null;
    throw new OperationError(typeof failure?.error === "string" ? failure.error : "ยังยืนยันผลไม่ได้ กรุณาลองรายการเดิม",
      typeof failure?.code === "string" ? failure.code : undefined);
  }
  return result as T;
}

export function OrganizationWallets({ profileHref = "/profile" }: { profileHref?: string }) {
  const [items, setItems] = useState<Item[]>([]), [actor, setActor] = useState("");
  const [selected, setSelected] = useState(""), [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [pending, setPending] = useState<Pending | null>(null), [packages, setPackages] = useState<Package[]>([]);
  const [action, setAction] = useState("transfer"), [recipientKind, setRecipientKind] = useState("PERSONAL");
  const [depositKind, setDepositKind] = useState<Kind>("GUILD");
  const requestSequence = useRef(0), lock = useRef(false);
  const current = items.find(item => item.kind + ":" + item.externalId === selected);
  const storageKey = actor ? "organization-operation:v1:" + actor : "";
  const savePending = (value: Pending | null) => {
    if (!storageKey) throw new Error("กรุณาโหลดบัญชีก่อน");
    if (value) sessionStorage.setItem(storageKey, JSON.stringify(value)); else sessionStorage.removeItem(storageKey);
    setPending(value);
  };
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : "ดำเนินการไม่สำเร็จ"); }
    finally { lock.current = false; setBusy(false); }
  };
  const receiveDirectory = useCallback((data: { items: Item[]; actorDiscordId: string }) => {
    setItems(data.items); setActor(data.actorDiscordId);
    const saved = sessionStorage.getItem("organization-operation:v1:" + data.actorDiscordId);
    if (saved) {
      try { const operation = JSON.parse(saved) as Pending; if (operation.actor === data.actorDiscordId && operation.key && operation.ref && operation.body) setPending(operation); }
      catch { /* An invalid local draft cannot trigger a transaction. */ }
    }
  }, []);
  const loadDirectory = async () => receiveDirectory(await api<{ items: Item[]; actorDiscordId: string }>());
  useEffect(() => {
    let alive = true;
    api<{ items: Item[]; actorDiscordId: string }>().then(data => { if (alive) receiveDirectory(data); })
      .catch(cause => { if (alive) setError(cause.message); });
    return () => { alive = false; };
  }, [receiveDirectory]);
  const loadDetail = async (ref: Ref, append = false, cursor?: string) => {
    const sequence = ++requestSequence.current;
    const data = await api<Detail>(query(ref, cursor ? { cursor } : undefined));
    if (sequence !== requestSequence.current) return;
    setDetail(previous => append && previous ? { ...data, organization: { ...data.organization, entries: [...previous.organization.entries, ...data.organization.entries] } } : data);
  };
  const choose = (value: string) => {
    setSelected(value); setDetail(null); setPackages([]);
    const ref = items.find(item => item.kind + ":" + item.externalId === value);
    if (ref) void run(() => loadDetail(ref));
  };
  const prepare = async (ref: Ref, body: Record<string, unknown>, summary: string) => {
    if (pending && !pending.done) throw new Error("กรุณาดำเนินการหรือยกเลิกรายการที่รอยืนยันก่อน");
    savePending({ key: crypto.randomUUID(), actor, ref: { kind: ref.kind, externalId: ref.externalId }, body, summary, attempted: false });
  };
  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void run(async () => {
      if (!current || !detail) return;
      const reason = String(form.get("reason") ?? "").trim();
      const target = { kind: recipientKind, externalId: String(form.get("recipient") ?? "").trim() };
      const recipient = await api<{ name: string }>("?" + new URLSearchParams({ kind: target.kind, id: target.externalId, recipient: "1" }));
      const amount = Number(form.get("amount"));
      if (action === "transfer" && (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000)) throw new Error("จำนวนต้องเป็นจำนวนเต็ม 1–100,000,000 Copper");
      await prepare(current, action === "close" ? { action, destination: target, reason } : { action, destination: target, amountCopper: amount, description: reason },
        current.name + " → " + recipient.name + " (" + target.externalId + ")\n" + (action === "close" ? "ขอปิดบัญชีและระงับยอดทั้งหมด รอฝ่ายการเงินอนุมัติจ่ายให้ผู้รับนี้" : money(amount) + " · ค่าธรรมเนียม 0 Copper") + "\n" + reason);
    });
  };
  const submitDeposit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    void run(async () => {
      const ref = { kind: depositKind, externalId: String(form.get("id") ?? "").trim() };
      const recipient = await api<{ name: string }>(query(ref, { recipient: "1" }));
      const amount = Number(form.get("amount"));
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000) throw new Error("จำนวนต้องเป็นจำนวนเต็ม 1–100,000,000 Copper");
      const description = String(form.get("reason") ?? "").trim();
      await prepare(ref, { action: "deposit", amountCopper: amount, description }, "บัญชีส่วนตัวของคุณ → " + recipient.name + " (" + ref.externalId + ")\n" + money(amount) + " · ค่าธรรมเนียม 0 Copper\n" + description);
    });
  };
  const confirm = () => void run(async () => {
    if (!pending || pending.actor !== actor || pending.done) return;
    savePending({ ...pending, attempted: true });
    let result: Record<string, unknown>;
    try { result = await api<Record<string, unknown>>(query(pending.ref), pending.body, pending.key); }
    catch (cause) {
      if (cause instanceof OperationError && ["PRICE_CHANGED", "PURCHASE_REFUNDED", "PACKAGE_NOT_AVAILABLE", "INSUFFICIENT_BALANCE", "SAME_ACCOUNT",
        "INVALID_DISCORD_ID", "INVALID_ID", "INVALID_TEXT", "INVALID_AMOUNT", "INVALID_MOTION", "INVALID_VOTE",
        "TARGET_NOT_MEMBER", "COMMITTEE_STATE_CONFLICT", "EMPTY_ELECTORATE", "MOTION_NOT_PENDING", "VOTE_ALREADY_CAST"].includes(cause.code ?? "")) {
        savePending({ ...pending, attempted: true, done: true, result: cause.message });
      }
      throw cause;
    }
    const purchase = result.purchase as { id?: string; status?: string } | undefined;
    const status = purchase?.status ?? result.status;
    // The same operation key remains available while payment/fulfillment is pending.
    if (["PENDING", "PROCESSING", "PAID", "REFUNDING", "FULFILLING"].includes(String(status)) && pending.body.action === "purchase") {
      setNotice("ระบบกำลังดำเนินการ กรุณาตรวจสอบด้วยรายการเดิม"); return;
    }
    const receipt = "บันทึกผลแล้ว" + (status ? " · " + (labels[String(status)] ?? String(status)) : "") + (result.transactionId ? " · เลขอ้างอิง " + String(result.transactionId) : "");
    savePending({ ...pending, attempted: true, done: true, result: receipt });
    setNotice(receipt);
    if (current) await loadDetail(current);
  });
  return <section className={styles.console} aria-label="กระเป๋าองค์กร">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>ME COIN · COMMUNITY WALLET</p><h1>กระเป๋า<span>องค์กร</span></h1>
        <p className={styles.headerIntro}>ดูแลเงินส่วนกลางไปด้วยกัน<br />เพื่อทุกกิจกรรมของกิลด์และเซิร์ฟเวอร์</p>
        <div className={styles.heroTags}><span>ME Coin เท่านั้น</span><span>ค่าธรรมเนียมการโอน 0</span><span>บัญชีเป็นขององค์กร</span></div>
      </div>
      <div className={styles.heroArt} aria-hidden="true"><div className={styles.artCard}><b>ME COIN</b><span /><small>GUILD &amp; SERVER</small></div><div className={styles.artCoin}>M</div><span className={styles.artSpark}>✧</span></div>
    </header>
    <nav className={styles.quickNav} aria-label="ส่วนต่าง ๆ ของกระเป๋า">
      <div className={styles.quickNavLinks}><a href="#organization-accounts">กระเป๋าขององค์กร</a><a href="#organization-support">โอนสนับสนุน</a>
        {detail && <><a href="#organization-packages">แพ็กเกจ</a>{current?.kind === "GUILD" && <a href="#organization-committee">กรรมการ</a>}<a href="#organization-history">ประวัติ</a></>}
      </div><button disabled={busy} onClick={() => void run(async () => { await loadDirectory(); if (current) await loadDetail(current); })}>↻ รีเฟรช</button>
    </nav>
    {error && <div className={styles.error} role="alert">{error}<p><a href={profileHref}>โปรไฟล์และการเชื่อม Discord</a></p></div>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {pending && <section className={styles.confirm} aria-label="ตรวจสอบรายการ"><h2>{pending.done ? "ผลรายการ" : "ตรวจสอบก่อนยืนยัน"}</h2><p className={styles.pre}>{pending.summary}</p><small>รหัสรายการ {pending.key}</small>
      {pending.result && <p>{pending.result}</p>}
      <div className={styles.row}>{!pending.done && <button disabled={busy} onClick={confirm}>{pending.attempted ? "ตรวจสอบ / ลองรายการเดิม" : "ยืนยันรายการ"}</button>}
        {(!pending.attempted || pending.done) && <button disabled={busy} onClick={() => { try { savePending(null); } catch { setError("บันทึกรายการในเบราว์เซอร์ไม่ได้"); } }}>{pending.done ? "เริ่มรายการใหม่" : "ยกเลิกร่าง"}</button>}</div>
      {pending.attempted && !pending.done && <p>กำลังรอผลรายการนี้ ใช้ปุ่มเดิมเพื่อตรวจสอบต่อได้แม้โหลดหน้าใหม่</p>}
    </section>}
    <div className={styles.grid}>
      <section className={styles.card} id="organization-accounts"><div className={styles.cardHeading}><span className={styles.cardIcon} aria-hidden="true">M</span><h2>กระเป๋าที่คุณจัดการ</h2></div><p>แสดงยอดและประวัติเฉพาะผู้มีสิทธิ์จัดการเงิน</p>
        <label>เลือกกระเป๋า<select value={selected} disabled={busy} onChange={event => choose(event.target.value)}><option value="">เลือกกิลด์หรือเซิร์ฟเวอร์</option>{items.map(item => <option key={item.kind + item.externalId} value={item.kind + ":" + item.externalId}>{labels[item.kind]} · {item.name}</option>)}</select></label>
        {actor && items.length === 0 && <p>ไม่พบกระเป๋าที่คุณมีสิทธิ์จัดการ คุณยังโอนสนับสนุนองค์กรจากบัญชีส่วนตัวได้</p>}
        {detail && current && <><p className={styles.status}>{labels[detail.organization.status] ?? detail.organization.status}</p><p className={styles.balance}>{money(detail.organization.balanceCopper)}</p><p>ยอดจอง {money(detail.organization.reservedCopper)}</p><p className={styles.mono}>{labels[current.kind]} ID: {current.externalId}</p>
          <p>{current.kind === "GUILD" ? "ผู้จัดการเงิน: " + detail.managerIds.join(", ") : "เจ้าของเซิร์ฟเวอร์และผู้มีสิทธิ์ Discord Administrator"}</p>
          <form onSubmit={submitPayment}><h3>จ่ายเงิน / ขอปิดบัญชี</h3><label>รายการ<select value={action} onChange={event => setAction(event.target.value)}><option value="transfer">โอน ME Coin</option><option value="close">ยื่นขอปิดบัญชี</option></select></label>
            <label>ประเภทผู้รับ<select value={recipientKind} onChange={event => setRecipientKind(event.target.value)}>{["PERSONAL", "GUILD", "DISCORD_SERVER"].map(kind => <option key={kind} value={kind}>{labels[kind]}</option>)}</select></label>
            <label>{recipientKind === "PERSONAL" ? "Discord User ID ผู้รับ" : "ID องค์กรผู้รับ"}<input name="recipient" required maxLength={24} autoComplete="off" /></label>
            {action === "transfer" && <label>จำนวน Copper<input name="amount" type="number" min="1" max="100000000" step="1" required /></label>}
            <label>{action === "close" ? "เหตุผลการปิดบัญชี" : "รายละเอียดรายการ"}<textarea name="reason" required minLength={3} maxLength={action === "close" ? 500 : 200} /></label>
            <button disabled={busy || (!!pending && !pending.done) || detail.organization.status === "CLOSED" || (action === "transfer" && detail.organization.status !== "ACTIVE")}>ตรวจสอบผู้รับและรายการ</button>
          </form></>}
      </section>
      <section className={styles.card} id="organization-support"><div className={styles.cardHeading}><span className={styles.cardIcon + " " + styles.cardIconBlue} aria-hidden="true">↗</span><h2>โอนสนับสนุนองค์กร</h2></div><p>จ่ายจากบัญชี ME Coin ส่วนตัวของคุณ ไม่จำเป็นต้องเป็นสมาชิกขององค์กร</p><form onSubmit={submitDeposit}><label>ประเภทองค์กร<select value={depositKind} onChange={event => setDepositKind(event.target.value as Kind)}><option value="GUILD">กิลด์</option><option value="DISCORD_SERVER">Discord server</option></select></label><label>ID องค์กร<input name="id" required maxLength={24} autoComplete="off" /></label><label>จำนวน Copper<input name="amount" type="number" min="1" max="100000000" step="1" required /></label><label>รายละเอียด<textarea name="reason" required minLength={3} maxLength={200} /></label><button disabled={busy || !actor || (!!pending && !pending.done)}>ตรวจสอบก่อนโอน</button></form>
        <p className={styles.hint}>กระเป๋ากิลด์และกระเป๋าเซิร์ฟเวอร์เป็นคนละบัญชี ใช้ ID ให้ตรงกับประเภทผู้รับ</p>
      </section>
    </div>
    {detail && current && <>
      <section className={styles.card} id="organization-packages"><h2>ซื้อแพ็กเกจ / บริการ</h2><p>ชำระจาก {current.name} · ต้องมีสิทธิ์จัดการ Discord server ที่รับบริการด้วย</p><button disabled={busy} onClick={() => void run(async () => { const result = await api<{ packages: Package[] }>(query(current), { action: "catalog" }); setPackages(result.packages); })}>โหลดแพ็กเกจและราคาปัจจุบัน</button>
        {packages.length > 0 && <form className={styles.inlineForm} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(async () => {
          const chosen = packages.find(item => item.type + ":" + item.id === form.get("package")); if (!chosen) return;
          const body = { action: "quote", packageType: chosen.type, packageId: chosen.id, serverId: String(form.get("serverId")).trim() };
          const result = await api<{ package: Package }>(query(current), body);
          await prepare(current, { ...body, action: "purchase", expectedCopper: result.package.priceCopper }, current.name + " → " + result.package.name + "\nDiscord server " + body.serverId + "\n" + money(result.package.priceCopper) + " · " + result.package.durationDays + " วัน");
        }); }}><label>แพ็กเกจ<select name="package">{packages.map(item => <option key={item.type + item.id} value={item.type + ":" + item.id}>{item.name} · {money(item.priceCopper)}</option>)}</select></label><label>Discord Server ID ที่รับบริการ<input name="serverId" required defaultValue={current.kind === "DISCORD_SERVER" ? current.externalId : ""} /></label><button disabled={busy || (!!pending && !pending.done) || detail.organization.status !== "ACTIVE"}>ตรวจสอบราคา</button></form>}
      </section>
      {current.kind === "GUILD" && <section className={styles.card} id="organization-committee"><h2>กรรมการกิลด์</h2><p>ต้องเห็นชอบครบทุกคนภายใน 72 ชั่วโมง เจ้าของ ผู้ร่วมก่อตั้ง และกรรมการนับคนละหนึ่งเสียง ผู้ถูกเสนอถอดถอนไม่ได้ลงมติ</p><p>กรรมการปัจจุบัน: {detail.committeeIds.join(", ") || "ยังไม่มี"}</p>
        <form className={styles.inlineForm} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void run(async () => {
          const motionAction = String(form.get("motionAction")), targetDiscordId = String(form.get("target")).trim(), reason = String(form.get("reason")).trim();
          await prepare(current, { action: "propose", motionAction, targetDiscordId, reason }, (motionAction === "APPOINT" ? "เสนอแต่งตั้ง " : "เสนอถอดถอน ") + targetDiscordId + "\n" + reason);
        }); }}><label>คำเสนอ<select name="motionAction"><option value="APPOINT">แต่งตั้ง</option><option value="REMOVE">ถอดถอน</option></select></label><label>Discord User ID สมาชิก<input name="target" required /></label><label>เหตุผล<textarea name="reason" minLength={3} maxLength={500} required /></label><button disabled={busy || (!!pending && !pending.done)}>ตรวจสอบคำเสนอ</button></form>
        {detail.motions.map(motion => <article className={styles.record} key={motion.id}><strong>{motion.action === "APPOINT" ? "แต่งตั้ง" : "ถอดถอน"} {motion.targetDiscordId} · {labels[motion.status] ?? motion.status}</strong><p>{motion.reason}</p><p>เห็นชอบ {motion.approvedBy.length}/{motion.electorate.length} · หมดเวลา {new Date(motion.expiresAt).toLocaleString("th-TH")}</p><small>มติ {motion.id}</small>
          {motion.status === "PENDING" && motion.electorate.includes(actor) && !motion.approvedBy.includes(actor) && <div className={styles.row}>{[true, false].map(approve => <button key={String(approve)} disabled={busy || (!!pending && !pending.done)} onClick={() => void run(() => prepare(current, { action: "vote", motionId: motion.id, approve }, (approve ? "เห็นชอบ" : "ไม่เห็นชอบ") + "มติ " + motion.id))}>{approve ? "เห็นชอบ" : "ไม่เห็นชอบ"}</button>)}</div>}
        </article>)}
      </section>}
      <section className={styles.card} id="organization-history"><h2>ประวัติรายการ</h2>{detail.organization.entries.length === 0 && <p>ยังไม่มีรายการ</p>}<div className={styles.tableWrap}><table><thead><tr><th>วันเวลา</th><th>รายการ</th><th>จำนวน</th><th>ผู้ดำเนินการ / อ้างอิง</th></tr></thead><tbody>{detail.organization.entries.map(entry => <tr key={entry.id}><td>{entry.postedAt ? new Date(entry.postedAt).toLocaleString("th-TH") : "—"}</td><td>{entry.description}</td><td>{entry.direction === "CREDIT" ? "+" : "−"}{money(entry.amountCopper)}</td><td>{entry.actorDiscordId ?? "ระบบ"}<small className={styles.reference}>{entry.reference}</small></td></tr>)}</tbody></table></div>
        {detail.organization.nextCursor && <button disabled={busy} onClick={() => void run(() => loadDetail(current, true, detail.organization.nextCursor!))}>รายการเก่ากว่า</button>}
      </section>
      {detail.organization.closures.length > 0 && <section className={styles.card}><h2>คำขอปิดบัญชี</h2>{detail.organization.closures.map(closure => <article className={styles.record} key={closure.id}><strong>{labels[closure.status] ?? closure.status} · {money(closure.amountCopper)}</strong><p>ผู้รับ: {closure.recipientName} · {closure.reason}</p>{closure.decisionNote && <p>ฝ่ายการเงิน: {closure.decisionNote}</p>}<small>{closure.id}</small></article>)}</section>}
    </>}
  </section>;
}
