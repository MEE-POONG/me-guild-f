"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export type MemberAuthMode = "login" | "register" | "verify-email" | "forgot-password" | "reset-password";
const labels: Record<MemberAuthMode, string> = { login: "เข้าสู่ระบบ", register: "สมัครสมาชิก", "verify-email": "ยืนยันอีเมล", "forgot-password": "ขอรหัสตั้งรหัสผ่านใหม่", "reset-password": "ตั้งรหัสผ่านใหม่" };
const errors: Record<string, string> = {
  CredentialsSignin: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  EMAIL_NOT_VERIFIED: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ ใช้ลิงก์ยืนยันอีเมลด้านล่างเพื่อขอรหัสใหม่",
  TOO_MANY_ATTEMPTS: "ลองหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่",
  INVALID_EMAIL: "กรุณากรอกอีเมลให้ถูกต้อง",
  INVALID_NAME: "กรุณากรอกชื่อที่แสดงไม่เกิน 80 ตัวอักษร",
  PASSWORD_TOO_SHORT: "ใช้รหัสผ่าน 12–128 ตัวอักษร",
  INVALID_CODE: "กรุณากรอกรหัส 8 หลักจากอีเมล",
  INVALID_OR_EXPIRED_CODE: "รหัสไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว กรุณาขอรหัสใหม่",
  EMAIL_DELIVERY_UNAVAILABLE: "ระบบส่งอีเมลยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแล",
  AUTH_UNAVAILABLE: "ระบบบัญชียังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง",
  VERIFIED_PROVIDER_EMAIL_REQUIRED: "กรุณายืนยันอีเมลกับ Google หรือ Discord ก่อนเข้าสู่ระบบ",
  ACCOUNT_LINK_REQUIRED: "มีบัญชีอีเมลนี้อยู่แล้ว กรุณายืนยันอีเมลหรือตั้งรหัสผ่านใหม่ก่อนเชื่อมบัญชี",
};
const subscribeHydration = () => () => { };

export function AuthError({ error }: { error?: string }) {
  return error ? <p role="alert" className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-200">{errors[error] ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง"}</p> : null;
}

export function MemberAuthForm({ mode, callbackUrl = "/member", initialEmail = "" }: { mode: MemberAuthMode; callbackUrl?: string; initialEmail?: string }) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const needsPassword = ["login", "verify-email", "reset-password"].includes(mode);
  const needsCode = mode === "verify-email" || mode === "reset-password";
  const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-base text-white outline-none focus-visible:border-lime focus-visible:ring-2 focus-visible:ring-lime/30";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    if ((mode === "verify-email" || mode === "reset-password") && password !== form.get("confirmPassword")) { setError("PASSWORD_MISMATCH"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        const response = await signIn("credentials", { email, password, redirect: false, callbackUrl });
        if (!response?.ok || response.error) { setError(response?.error ?? "CredentialsSignin"); return; }
        window.location.assign(callbackUrl);
        return;
      }
      const response = await fetch(`/api/account/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name: form.get("name"), code: form.get("code") }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "AUTH_UNAVAILABLE"); return; }
      setMessage(data.message);
      setComplete(true);
      formElement.reset();
    } catch { setError("AUTH_UNAVAILABLE"); }
    finally { setBusy(false); }
  }

  async function resend() {
    if (!email || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/account/resend-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) setError(data.error ?? "AUTH_UNAVAILABLE"); else setMessage(data.message);
    } catch { setError("AUTH_UNAVAILABLE"); }
    finally { setBusy(false); }
  }

  return <div className="my-6">
    <form method="post" onSubmit={submit} className="grid gap-4" aria-label={labels[mode]}>
      {mode === "register" && <div><label htmlFor="member-name" className="text-sm">ชื่อที่แสดง</label><input id="member-name" name="name" autoComplete="nickname" maxLength={80} required className={inputClass} />
      </div>}
      <div><label htmlFor="member-email" className="text-sm">อีเมล</label><input id="member-email" name="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} required className={inputClass} />
      </div>
      {needsCode && <div><label htmlFor="member-code" className="text-sm">รหัสยืนยัน 8 หลักจากอีเมล</label><input id="member-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" minLength={8} maxLength={8} required className={inputClass} /><p className="mt-2 text-xs text-white/50">รหัสใช้ได้ครั้งเดียวภายใน 15 นาที</p></div>}
      {needsPassword && <div><label htmlFor="member-password" className="text-sm">{mode === "reset-password" ? "รหัสผ่านใหม่" : "รหัสผ่าน"}</label><input id="member-password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 12} maxLength={128} required className={inputClass} />{mode !== "login" && <p className="mt-2 text-xs text-white/50">ใช้ 12–128 ตัวอักษร สามารถใช้วลีที่จำง่ายได้</p>}</div>}
      {(mode === "verify-email" || mode === "reset-password") && <div><label htmlFor="member-confirm" className="text-sm">ยืนยันรหัสผ่าน</label><input id="member-confirm" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className={inputClass} />
      </div>}
      {error === "PASSWORD_MISMATCH" ? <p role="alert" className="text-sm text-red-200">รหัสผ่านทั้งสองช่องไม่ตรงกัน</p> : <AuthError error={error} />}
      {message && <p role="status" className="rounded-xl border border-lime/20 bg-lime/5 p-4 text-sm leading-6 text-lime">{message}</p>}
      <button type="submit" disabled={!hydrated || busy} className="button-primary w-full justify-center disabled:opacity-50">{busy ? "กำลังดำเนินการ…" : labels[mode]}</button>
      {mode === "verify-email" && <button type="button" onClick={resend} disabled={busy || !email} className="min-h-11 text-sm text-lime disabled:opacity-50">ส่งรหัสยืนยันอีเมลอีกครั้ง</button>}
    </form>
    <nav aria-label="เมนูบัญชี" className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm text-white/65">
      {mode !== "login" && <Link href="/login" className="underline underline-offset-4">เข้าสู่ระบบ</Link>}
      {mode === "login" && <><Link href="/register" className="text-lime underline underline-offset-4">สมัครสมาชิก</Link><Link href="/forgot-password" className="underline underline-offset-4">ลืมรหัสผ่าน</Link><Link href="/verify-email" className="underline underline-offset-4">ยืนยันอีเมล</Link></>}
      {mode === "register" && complete && <Link href={`/verify-email?email=${encodeURIComponent(email)}`} className="text-lime underline underline-offset-4">กรอกรหัสยืนยันอีเมล</Link>}
      {mode === "forgot-password" && <Link href={`/reset-password?email=${encodeURIComponent(email)}`} className="text-lime underline underline-offset-4">ฉันได้รับรหัสแล้ว</Link>}
      {mode === "reset-password" && <Link href="/forgot-password" className="underline underline-offset-4">ขอรหัสใหม่</Link>}
    </nav>
  </div>;
}
