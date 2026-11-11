"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { GuildBrand } from "@/container/public/guild-brand";
import { memberAuthSwitchHref } from "@/lib/member-auth-page";
import { credentialInputError, getMemberCredentialStatus, memberCredentialError, requestMemberCredentialCode, submitMemberCredentials, type MemberCredentialChallenge, type MemberCredentialStatus } from "@/lib/member-credentials";
import styles from "./member-credentials.module.css";

type AccountState = { kind: "loading" | "error" } | { kind: "ready"; data: MemberCredentialStatus };

export function MemberAccount({ returnTo }: { returnTo: string }) {
  const [state, setState] = useState<AccountState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [challenge, setChallenge] = useState<MemberCredentialChallenge | null>(null);
  const [pending, setPending] = useState<"request" | "save" | null>(null);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<"username" | "password" | "code" | null>(null);
  const [visible, setVisible] = useState(false);
  const inFlight = useRef<AbortController | null>(null);
  const codeField = useRef<HTMLInputElement>(null);
  const status = state.kind === "ready" ? state.data : null;

  useEffect(() => {
    const controller = new AbortController();
    getMemberCredentialStatus({ origin: window.location.origin, fetch, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) })
      .then(data => { if (!controller.signal.aborted) { setState({ kind: "ready", data }); setUsername(data.username ?? ""); } })
      .catch(() => { if (!controller.signal.aborted) setState({ kind: "error" }); });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => () => inFlight.current?.abort(), []);
  useEffect(() => { if (challenge) codeField.current?.focus(); }, [challenge]);

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!status || inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    setPending("request"); setError(""); setErrorField(null);
    try {
      const next = await requestMemberCredentialCode(status.authenticated ? undefined : identifier, { origin: window.location.origin, fetch, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) });
      if (!controller.signal.aborted) setChallenge(next);
    } catch (failure) {
      if (!controller.signal.aborted) setError(memberCredentialError(failure));
    } finally {
      if (!controller.signal.aborted) setPending(null);
      if (inFlight.current === controller) inFlight.current = null;
    }
  }

  async function saveCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge || inFlight.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("password") ?? "");
    const inputError = credentialInputError(username, password);
    if (inputError) { setError(inputError); setErrorField(inputError.startsWith("ชื่อผู้ใช้") ? "username" : "password"); return; }
    const controller = new AbortController();
    inFlight.current = controller;
    setPending("save"); setError(""); setErrorField(null);
    try {
      const target = await submitMemberCredentials({ action: "verify-and-set", challengeId: challenge.challengeId, code: String(fields.get("code") ?? ""), username: username.trim().toLowerCase(), password, returnTo }, { origin: window.location.origin, fetch, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) });
      if (!controller.signal.aborted) { form.reset(); window.location.assign(target); }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(memberCredentialError(failure));
        setErrorField(failure instanceof Error && failure.message === "MEMBER_CODE_INVALID" ? "code" : failure instanceof Error && failure.message === "MEMBER_USERNAME_UNAVAILABLE" ? "username" : null);
      }
    } finally {
      if (!controller.signal.aborted) setPending(null);
      if (inFlight.current === controller) inFlight.current = null;
    }
  }

  return <main className={styles.page}>
    <header className={styles.header}><GuildBrand /><Link href="/">กลับหน้าหลัก</Link></header>
    <section className={styles.security} aria-labelledby="account-title">
      <h1 id="account-title">{status?.authenticated ? "ชื่อผู้ใช้และรหัสผ่านของคุณ" : "เข้าใช้บัญชีสมาชิกเดิม"}</h1>
      <p>ยืนยันเจ้าของบัญชีทางอีเมลก่อนตั้งชื่อผู้ใช้และรหัสผ่าน ข้อมูลสมาชิก ทะเบียน และบัญชีที่เชื่อมไว้จะยังเป็นของบัญชีเดิม</p>
      {state.kind === "loading" ? <p role="status">กำลังตรวจสอบบัญชี…</p> : null}
      {state.kind === "error" ? <div role="alert"><p>ยังตรวจสอบบัญชีไม่ได้ กรุณาลองอีกครั้ง</p><button className={styles.secondary} onClick={() => { setState({ kind: "loading" }); setAttempt(value => value + 1); }}>ตรวจสอบอีกครั้ง</button></div> : null}
      {status ? <>
        {status.authenticated ? <div className={styles.notice}>
          <p>{status.passwordConfigured ? "บัญชีนี้ตั้งรหัสผ่านไว้แล้ว คุณเปลี่ยนได้หลังยืนยันรหัสทางอีเมลอีกครั้ง" : "เพิ่มวิธีเข้าสู่ระบบด้วยรหัสผ่านให้บัญชีที่คุณใช้อยู่"}</p>
          {status.username ? <p>ชื่อผู้ใช้ปัจจุบัน: <strong>{status.username}</strong></p> : null}
          {status.emailHint ? <p>อีเมลสำหรับยืนยัน: {status.emailHint}</p> : null}
        </div> : <div className={styles.notice}><p>หากเคยลงทะเบียนด้วย Discord หรือ Google ให้ใช้อีเมลเดียวกับบัญชีเดิม ขั้นตอนนี้ไม่สร้างบัญชีสมาชิกใหม่</p><p>หรือ <Link href={memberAuthSwitchHref("login", returnTo)}>เข้าสู่ระบบด้วยบัญชีที่เคยใช้</Link> แล้วเชื่อมอีกช่องทางภายหลัง</p></div>}

        {!challenge ? <form onSubmit={requestCode}>
          {!status.authenticated ? <label className={styles.field} htmlFor="recovery-identifier">ชื่อผู้ใช้หรืออีเมลของบัญชีเดิม<input id="recovery-identifier" name="identifier" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={254} value={identifier} onChange={event => setIdentifier(event.target.value)} disabled={pending !== null} /></label> : null}
          <button className={styles.primary} type="submit" disabled={pending !== null} aria-busy={pending === "request"}>{pending === "request" ? "กำลังขอรหัสยืนยัน…" : "รับรหัสยืนยันทางอีเมล"}</button>
          <p className={styles.help}>รหัสมีอายุ 10 นาทีและใช้ได้ครั้งเดียว การตั้งรหัสผ่านใหม่จะออกจากระบบในอุปกรณ์อื่นของบัญชีนี้</p>
        </form> : <>
          <div className={styles.notice} role="status"><p>{status.authenticated ? "ส่งคำขอรหัสยืนยันแล้ว กรุณาตรวจอีเมลของคุณ" : "หากข้อมูลตรงกับบัญชีเดิม ระบบจะส่งรหัสยืนยันไปยังอีเมลของบัญชีนั้น กรุณาตรวจกล่องจดหมายและสแปม"}</p><p>รหัสอ้างอิง: <strong>{challenge.reference}</strong> · ใช้รหัสจากอีเมลฉบับล่าสุด</p></div>
          <form onSubmit={saveCredentials}>
            <label className={styles.field} htmlFor="account-code">รหัสยืนยัน 6 หลัก<input ref={codeField} id="account-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required aria-invalid={errorField === "code" ? true : undefined} aria-describedby={errorField === "code" ? "account-error" : undefined} disabled={pending !== null} /></label>
            <label className={styles.field} htmlFor="account-username">ชื่อผู้ใช้สำหรับเข้าสู่ระบบ<input id="account-username" name="username" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required minLength={3} maxLength={32} pattern="[A-Za-z0-9][A-Za-z0-9_.\-]{1,30}[A-Za-z0-9]" value={username} onChange={event => setUsername(event.target.value)} aria-invalid={errorField === "username" ? true : undefined} aria-describedby={errorField === "username" ? "username-help account-error" : "username-help"} disabled={pending !== null} /></label>
            <p className={styles.help} id="username-help">3–32 ตัว ใช้ a–z, 0–9, จุด, ขีดกลาง หรือขีดล่าง ขึ้นต้นและลงท้ายด้วยตัวอักษรหรือตัวเลข</p>
            <label className={styles.field} htmlFor="account-password">รหัสผ่านใหม่<input id="account-password" name="password" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={15} maxLength={72} aria-invalid={errorField === "password" ? true : undefined} aria-describedby={errorField === "password" ? "password-help account-error" : "password-help"} disabled={pending !== null} /></label>
            <p className={styles.help} id="password-help">อย่างน้อย 15 ตัวอักษร ไม่เกิน 72 ไบต์ และหลีกเลี่ยงรหัสผ่านที่เดาง่าย อักษรไทยหรืออีโมจิอาจใช้หลายไบต์ ใช้ตัวจัดการรหัสผ่านช่วยสร้างและบันทึกได้</p>
            <label className={styles.toggle}><input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)} />แสดงรหัสผ่าน</label>
            <button className={styles.primary} type="submit" disabled={pending !== null} aria-busy={pending === "save"}>{pending === "save" ? "กำลังยืนยันและบันทึก…" : "ยืนยันและใช้บัญชีเดิม"}</button>
          </form>
          <button className={styles.secondary} type="button" disabled={pending !== null} onClick={() => requestCode()} aria-busy={pending === "request"}>{pending === "request" ? "กำลังขอรหัสใหม่…" : "ขอรหัสยืนยันใหม่"}</button>
        </>}
        {error ? <p id="account-error" className={styles.error} role="alert">{error}</p> : null}
      </> : null}
      <Link className={styles.back} href={memberAuthSwitchHref("login", returnTo)}>กลับหน้าเข้าสู่ระบบและจัดการบัญชีที่เชื่อมไว้</Link>
    </section>
  </main>;
}
