"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Arrow, GuildBrand } from "@/container/public/guild-brand";
import { parseAdventurerRegistration, registrationHref, type AdventurerRegistration } from "@/lib/adventurer-registration";
import { memberAuthSwitchHref } from "@/lib/member-auth-page";
import styles from "./adventurer-registration.module.css";

type RegistrationState = { kind: "loading" | "anonymous" | "error" } | { kind: "ready"; data: AdventurerRegistration };

export function AdventurerRegistrationForm({ returnTo }: { returnTo: string }) {
  const [state, setState] = useState<RegistrationState>({ kind: "loading" });
  const [realName, setRealName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptRules, setAcceptRules] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const data = state.kind === "ready" ? state.data : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/adventure/registration", { cache: "no-store", credentials: "same-origin", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) })
      .then(async response => {
        if (response.status === 401) { if (!controller.signal.aborted) setState({ kind: "anonymous" }); return; }
        if (!response.ok) throw new Error("unavailable");
        const registration = parseAdventurerRegistration(await response.json());
        if (!controller.signal.aborted) {
          setState({ kind: "ready", data: registration });
          setRealName(registration.realName ?? "");
          setDisplayName(registration.displayName);
        }
      }).catch(() => { if (!controller.signal.aborted) setState({ kind: "error" }); });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => () => inFlight.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || inFlight.current || data.status === "ADVENTURER") return;
    if (!data.profileCompleted && (realName.trim().length < 2 || displayName.trim().length < 2)) {
      setError("กรุณากรอกชื่อจริงและชื่อที่แสดงอย่างน้อย 2 ตัวอักษร โดยไม่นับช่องว่างหัวท้าย");
      return;
    }
    const controller = new AbortController();
    inFlight.current = controller;
    setPending(true); setError("");
    try {
      const body = data.profileCompleted
        ? { action: "register-adventurer", acceptRules }
        : { action: "save-visitor", realName: realName.trim(), displayName: displayName.trim() };
      const response = await fetch("/api/adventure/registration", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
      if (response.status === 401) { setState({ kind: "anonymous" }); return; }
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "ยังบันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง");
      const registration = parseAdventurerRegistration(payload);
      if (!controller.signal.aborted) {
        setState({ kind: "ready", data: registration }); setSaved(true);
        heading.current?.focus();
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error && failure.name !== "TimeoutError" && failure.message !== "INVALID_REGISTRATION" ? failure.message : "ยังตรวจสอบผลการบันทึกไม่ได้ กรุณาลองอีกครั้ง ระบบจะไม่ลงทะเบียนซ้ำ");
    } finally {
      if (!controller.signal.aborted) setPending(false);
      if (inFlight.current === controller) inFlight.current = null;
    }
  }

  return <main className={styles.page}>
    <header className={styles.header}><GuildBrand /><Link href="/">กลับหน้าหลัก</Link></header>
    <section className={styles.panel} aria-labelledby="registration-title">
      <h1 id="registration-title" ref={heading} tabIndex={-1}>{data?.status === "ADVENTURER" ? "พร้อมออกผจญภัยแล้ว" : data?.profileCompleted ? "ลงทะเบียนนักผจญภัย" : "เริ่มต้นในฐานะผู้มาเยือน"}</h1>
      <p className={styles.intro}>บันทึกข้อมูลจริงเป็นผู้มาเยือน แล้วเลือกลงทะเบียนนักผจญภัยเพื่อเริ่มเลเวล 1</p>
      <ol className={styles.steps} aria-label="ขั้นตอนสมัคร">
        <li aria-current={data && !data.profileCompleted ? "step" : undefined}>ข้อมูลผู้มาเยือน{data?.profileCompleted ? " · บันทึกแล้ว" : ""}</li>
        <li aria-current={data?.profileCompleted && data.status === "VISITOR" ? "step" : undefined}>นักผจญภัย เลเวล 1{data?.status === "ADVENTURER" ? " · ลงทะเบียนแล้ว" : ""}</li>
      </ol>

      {state.kind === "loading" ? <p role="status">กำลังตรวจสอบทะเบียนของคุณ…</p> : null}
      {state.kind === "anonymous" ? <div><p>เข้าสู่ระบบเพื่อบันทึกข้อมูลและตรวจสอบว่าคุณลงทะเบียนนักผจญภัยแล้วหรือยัง</p><Link className={styles.primary} href={memberAuthSwitchHref("login", registrationHref(returnTo))}>เข้าสู่ระบบ <Arrow /></Link></div> : null}
      {state.kind === "error" ? <div role="alert"><p>ยังอ่านทะเบียนไม่ได้ กรุณาลองอีกครั้ง</p><button className={styles.primary} onClick={() => { setState({ kind: "loading" }); setAttempt(value => value + 1); }}>ตรวจสอบอีกครั้ง</button></div> : null}

      {data?.status === "ADVENTURER" ? <div>
        <p role="status">{saved ? "ลงทะเบียนนักผจญภัยสำเร็จ คุณเริ่มต้นที่เลเวล 1" : "บัญชีนี้ลงทะเบียนนักผจญภัยแล้ว"}</p>
        <p>ดูระดับปัจจุบันและฝึกทักษะชีวิตจริงตามเกณฑ์สอบหรือเควสต่อเนื่องของแต่ละทักษะ</p>
        <div className={styles.actions}><Link className={styles.primary} href={returnTo}>ไปต่อ <Arrow /></Link><Link href="/adventure/skills">ดูทักษะและระดับของฉัน</Link></div>
      </div> : null}

      {data?.status === "VISITOR" ? <form onSubmit={submit}>
        {!data.profileCompleted ? <>
          <p className={styles.status}>สถานะผู้มาเยือน · ยังไม่มีเลเวลนักผจญภัย</p>
          <label className={styles.field} htmlFor="real-name">ชื่อ–นามสกุลจริง<input id="real-name" name="realName" autoComplete="name" required minLength={2} maxLength={120} value={realName} onChange={event => setRealName(event.target.value)} aria-describedby="real-name-help" disabled={pending} /></label>
          <p id="real-name-help" className={styles.help}>ใช้สำหรับทะเบียนสมาชิก ชื่อจริงจะไม่แสดงในหน้าสาธารณะ</p>
          <label className={styles.field} htmlFor="display-name">ชื่อที่แสดงในกิลด์<input id="display-name" name="displayName" autoComplete="nickname" required minLength={2} maxLength={80} value={displayName} onChange={event => setDisplayName(event.target.value)} disabled={pending} /></label>
          <button className={styles.primary} disabled={pending} aria-busy={pending}>{pending ? "กำลังบันทึก…" : "บันทึกข้อมูลผู้มาเยือน"}</button>
        </> : <>
          <p className={styles.status} role="status">{saved ? "บันทึกข้อมูลแล้ว · " : ""}{data.displayName} · ผู้มาเยือน</p>
          <p>เมื่อลงทะเบียน คุณจะเป็นนักผจญภัยเลเวล 1 ส่วนทักษะที่ยังไม่ได้ประเมินจะรอการรับรองตามหลักฐานจริง</p>
          <label className={styles.consent}><input type="checkbox" checked={acceptRules} onChange={event => setAcceptRules(event.target.checked)} required disabled={pending} /><span>ฉันยืนยันว่าข้อมูลเป็นจริง และเข้าใจว่าการเลื่อนขั้นต้องผ่านข้อสอบหรือเควสตามเกณฑ์ของแต่ละทักษะ</span></label>
          <button className={styles.primary} disabled={pending || !acceptRules} aria-busy={pending}>{pending ? "กำลังลงทะเบียน…" : "ลงทะเบียนนักผจญภัย · เลเวล 1"}</button>
          <Link className={styles.secondary} href={returnTo}>สำรวจต่อในฐานะผู้มาเยือน</Link>
        </>}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </form> : null}
      <footer className={styles.footer}><Link href="/adventure/skills/library">สำรวจอาชีพ ทักษะ และเกณฑ์เลื่อนขั้น <Arrow /></Link></footer>
    </section>
  </main>;
}
