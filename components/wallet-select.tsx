"use client";

import { useEffect, useId, useState } from "react";
import styles from "./organization-wallets.module.css";

export type WalletOption = { value: string; label: string; description?: string };
type Page = { items: WalletOption[]; nextCursor?: string | null; truncated?: boolean };
type Props = {
  label: string; name?: string; options?: WalletOption[]; endpoint?: string;
  value?: string; defaultValue?: string; onChange?: (value: string) => void;
  disabled?: boolean; required?: boolean; emptyMessage?: string;
};

export function WalletSelect({ label, name, options = [], endpoint, value, defaultValue = "", onChange,
  disabled = false, required = true, emptyMessage = "ไม่พบรายการ ลองค้นหาด้วยชื่ออื่น" }: Props) {
  const id = useId();
  const [search, setSearch] = useState(""), [cursor, setCursor] = useState(""), [retry, setRetry] = useState(0);
  const [picked, setPicked] = useState<WalletOption | null>(() => options.find(item => item.value === defaultValue) ?? null);
  const [remote, setRemote] = useState<Page & { key: string; error?: string }>({ key: "", items: [] });
  const requestKey = JSON.stringify([endpoint, search, cursor, retry]);
  const loading = Boolean(endpoint && remote.key !== requestKey);
  useEffect(() => {
    if (!endpoint) return;
    const controller = new AbortController();
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.set("q", search.trim());
        if (cursor) url.searchParams.set("cursor", cursor);
        const response = await fetch(url, { signal: controller.signal, credentials: "same-origin", cache: "no-store" });
        const data = await response.json() as Page & { error?: string };
        if (!response.ok || !Array.isArray(data.items)) throw new Error(data.error || "โหลดรายชื่อไม่สำเร็จ กรุณาลองอีกครั้ง");
        if (alive) setRemote(previous => ({ ...data, key: requestKey,
          items: cursor ? [...new Map([...previous.items, ...data.items].map(item => [item.value, item])).values()] : data.items }));
      } catch (error) {
        if (alive) setRemote({ key: requestKey, items: [], error: error instanceof Error ? error.message : "โหลดรายชื่อไม่สำเร็จ" });
      }
    }, search ? 250 : 0);
    return () => { alive = false; clearTimeout(timer); controller.abort(); };
  }, [endpoint, search, cursor, retry, requestKey]);
  const items = endpoint ? (loading ? [] : remote.items) : options.filter(item =>
    `${item.label} ${item.description ?? ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const selected = value ?? picked?.value ?? "";
  const choice = options.find(item => item.value === selected) ?? (picked?.value === selected ? picked : undefined);
  // Static lists may change after a refresh or committee vote. Never submit a removed option.
  const safeValue = endpoint || options.some(item => item.value === selected) ? selected : "";
  const message = loading ? "กำลังโหลดรายชื่อ…" : remote.error && endpoint ? remote.error : items.length ? "" : emptyMessage;
  return <div className={styles.picker}>
    <label htmlFor={id}>{label}</label>
    {(endpoint || options.length > 8) && <input type="search" value={search} maxLength={80} disabled={disabled}
      aria-label={"ค้นหา" + label} placeholder="พิมพ์ชื่อเพื่อค้นหา" autoComplete="off"
      onChange={event => { setSearch(event.target.value); setCursor(""); }} />}
    <select id={id} name={name} required={required} value={safeValue} disabled={disabled}
      aria-busy={loading} aria-describedby={message ? id + "-status" : undefined}
      onChange={event => {
        const next = items.find(item => item.value === event.target.value) ?? null;
        setPicked(next); onChange?.(event.target.value);
      }}>
      <option value="">เลือก{label}</option>
      {safeValue && choice && !items.some(item => item.value === safeValue) &&
        <optgroup label="ที่เลือกไว้"><option value={choice.value}>{choice.label}{choice.description ? " · " + choice.description : ""}</option></optgroup>}
      {items.map(item => <option key={item.value} value={item.value}>{item.label}{item.description ? " · " + item.description : ""}</option>)}
    </select>
    {message && <p id={id + "-status"} className={styles.pickerHint} role="status">{message}</p>}
    {!loading && endpoint && remote.error && <button type="button" disabled={disabled} onClick={() => { setCursor(""); setRetry(count => count + 1); }}>โหลดรายชื่ออีกครั้ง</button>}
    {!loading && endpoint && remote.nextCursor && <button type="button" disabled={disabled} onClick={() => setCursor(remote.nextCursor!)}>แสดงรายชื่อเพิ่มเติม</button>}
    {!loading && endpoint && remote.truncated && <p className={styles.pickerHint}>พิมพ์ชื่อให้เจาะจงขึ้นเพื่อค้นหาคนที่ต้องการ</p>}
  </div>;
}
