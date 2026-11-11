"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { memberAccountHref, memberCredentialError, submitMemberCredentials } from "@/lib/member-credentials";
import styles from "./member-credentials.module.css";

export function MemberCredentialsLogin({ returnTo, disabled, onPendingChange }: { returnTo: string; disabled: boolean; onPendingChange(pending: boolean): void }) {
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => () => inFlight.current?.abort(), []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || inFlight.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const controller = new AbortController();
    inFlight.current = controller;
    setPending(true); onPendingChange(true); setError("");
    try {
      const target = await submitMemberCredentials({ action: "login", identifier: String(fields.get("identifier") ?? "").trim(), password: String(fields.get("password") ?? ""), returnTo }, { origin: window.location.origin, fetch, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
      if (!controller.signal.aborted) { form.reset(); window.location.assign(target); }
    } catch (failure) {
      if (!controller.signal.aborted) setError(memberCredentialError(failure));
    } finally {
      if (!controller.signal.aborted) { setPending(false); onPendingChange(false); }
      if (inFlight.current === controller) inFlight.current = null;
    }
  }

  return <form className={styles.loginForm} onSubmit={signIn} aria-labelledby="credential-login-title">
    <h2 id="credential-login-title">เข้าสู่บัญชีเดิมด้วยรหัสผ่าน</h2>
    <label className={styles.field} htmlFor="member-identifier">ชื่อผู้ใช้หรืออีเมล<input id="member-identifier" name="identifier" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={254} aria-describedby={error ? "credential-login-error" : undefined} aria-invalid={error ? true : undefined} disabled={disabled || pending} /></label>
    <label className={styles.field} htmlFor="member-password">รหัสผ่าน<input id="member-password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" required maxLength={72} aria-describedby={error ? "credential-login-error" : undefined} aria-invalid={error ? true : undefined} disabled={disabled || pending} /></label>
    <label className={styles.toggle}><input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)} />แสดงรหัสผ่าน</label>
    {error ? <p id="credential-login-error" className={styles.error} role="alert">{error}</p> : null}
    <button className={styles.primary} type="submit" disabled={disabled || pending} aria-busy={pending}>{pending ? "กำลังตรวจสอบบัญชี…" : "เข้าสู่ระบบด้วยรหัสผ่าน"}</button>
    <p className={styles.help}><Link href={memberAccountHref(returnTo)}>ลืมรหัสผ่าน หรือยังไม่เคยตั้งรหัสผ่าน</Link></p>
    <p className={styles.help}>สมาชิกเดิมใช้รหัสยืนยันทางอีเมลเพื่อตั้งชื่อผู้ใช้และรหัสผ่านได้ โดยใช้บัญชีและทะเบียนเดิม</p>
  </form>;
}
