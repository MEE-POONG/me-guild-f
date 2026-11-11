"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FaDiscord } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { Arrow, GuildBrand } from "@/container/public/guild-brand";
import { GuildTilt, Motion } from "@/container/public/motion";
import { endAdventureMemberSession, startAdventureMemberLogin } from "@/lib/adventure-member-login";
import { memberAuthSwitchHref, type MemberAuthMode } from "@/lib/member-auth-page";
import type { MemberAuthProvider, MemberLoginStatus } from "@/lib/member-login-status";
import { registrationHref } from "@/lib/adventurer-registration";
import { memberAccountHref } from "@/lib/member-credentials";
import { MemberCredentialsLogin } from "./member-credentials-login";
import styles from "./member-login.module.css";

type MemberLoginProps = Pick<MemberLoginStatus, "configured" | "providers" | "currentProvider" | "linkedProviders" | "discordReady" | "currentDisplayName" | "registration"> & {
  mode?: MemberAuthMode;
  returnTo: string;
  initialError: string | null;
};

export function AdventureMemberLogin({ mode = "login", configured, providers, linkedProviders, discordReady, returnTo, initialError, currentDisplayName, registration }: MemberLoginProps) {
  const register = mode === "register";
  const marketplace = returnTo.split(/[?#]/)[0] === "/adventure/marketplace";
  const raffle = returnTo.split(/[?#]/)[0] === "/adventure/raffles";
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const signedIn = currentDisplayName !== null;
  const needsDiscord = signedIn && !discordReady;
  const needsRegistration = signedIn && registration?.status !== "ADVENTURER";
  const [pending, setPending] = useState<MemberAuthProvider | "signout" | null>(null);
  const [credentialsPending, setCredentialsPending] = useState(false);
  const [actionResult, setActionResult] = useState<{ error: string | null } | null>(null);
  const error = actionResult === null ? initialError : actionResult.error;
  const inFlight = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; inFlight.current?.abort(); };
  }, []);

  async function authenticate(action: MemberAuthProvider | "signout") {
    if (!configured || action !== "signout" && !providers[action] || inFlight.current || pending !== null || credentialsPending) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const timer = setTimeout(() => controller.abort("timeout"), 15_000);
    setPending(action);
    setActionResult({ error: null });
    try {
      const dependencies = { origin: window.location.origin, fetch, signal: controller.signal };
      const destination = action === "google" ? `/adventure/login?${new URLSearchParams({ returnTo })}` : returnTo;
      const target = action === "signout"
        ? await endAdventureMemberSession(dependencies)
        : await startAdventureMemberLogin(action, destination, dependencies, { link: signedIn });
      if (!controller.signal.aborted) {
        const navigation = new URL(target, window.location.origin);
        if (action === "signout") navigation.searchParams.set("returnTo", returnTo);
        window.location.assign(navigation.toString());
      }
    } catch {
      if (mounted.current && (!controller.signal.aborted || controller.signal.reason === "timeout")) {
        setActionResult({ error: action === "signout" ? "ยังออกจากระบบสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : `ยังเปิด ${action === "google" ? "Google" : "Discord"} ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง` });
        setPending(null);
      }
    } finally {
      clearTimeout(timer);
      if (inFlight.current === controller) inFlight.current = null;
    }
  }

  function refreshStatus() {
    setActionResult(null);
    startRefresh(() => router.refresh());
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <GuildBrand className={styles.brand} />
      <Link href="/" className={styles.home}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m3 10 9-7 9 7v10h-6v-6H9v6H3Z" /></svg>
        กลับหน้าหลัก
      </Link>
    </header>

    <Motion className={styles.layout}>
      <figure className={styles.visual} data-reveal>
        <GuildTilt className={styles.portrait}>
          <Image src="/adventure/guild-welcome.webp" alt="เหล่านักผจญภัยพบปะกันที่ประตูกิลด์ ท่ามกลางอาคารสีงาช้างและธงสีเขียว" fill sizes="(max-width: 760px) 1px, (max-width: 1300px) 48vw, 600px" loading="eager" className={styles.image} />
        </GuildTilt>
        <figcaption>ทุกการผจญภัย มีเพื่อนร่วมทาง</figcaption>
        <div className={styles.visualRule} aria-hidden="true"><span>✦</span></div>
      </figure>

      <section className={styles.panel} aria-labelledby="member-login-title" data-reveal>
        <div className={styles.topSwitch}>
          <Link href={memberAuthSwitchHref(register ? "login" : "register", returnTo)}>
            {register ? "เข้าสู่ระบบ" : "สมัครสมาชิก"} <Arrow />
          </Link>
        </div>
        <h1 id="member-login-title">{register ? <><span className={styles.headingPhrase}>เริ่มการผจญภัย</span><wbr /><span className={styles.headingPhrase}>ของคุณ</span></> : "ยินดีต้อนรับกลับ"}</h1>
        <p className={styles.intro}>{register
          ? "ยืนยันตัวตนและบันทึกข้อมูลจริงเป็นผู้มาเยือน แล้วลงทะเบียนนักผจญภัยหลังเข้าสู่ระบบเพื่อเริ่มเลเวล 1"
          : marketplace ? "กลับมาเปิดกระเป๋า แลกเปลี่ยนกับเพื่อน และติดตามการประมูลของคุณ"
            : raffle ? "กลับมาดูตั๋วของคุณ และร่วมกิจกรรมที่เปิดรับในกิลด์"
              : "กลับมาพบเพื่อนและไปต่อกับการผจญภัยของคุณ"}</p>

        {currentDisplayName !== null ? <div className={styles.account}>
          <p>คุณเข้าสู่ระบบอยู่แล้วในชื่อ <strong>{currentDisplayName}</strong></p>
          {needsRegistration ? <p>ตรวจทะเบียนผู้มาเยือนและลงทะเบียนนักผจญภัยเพื่อเริ่มเลเวล 1</p> : <p>{registration?.registrationSource === "DISCORD_BOT" ? "พบทะเบียนนักผจญภัยจาก Discord ที่ยืนยันแล้ว ใช้ทะเบียนเดิมได้เลย" : "ลงทะเบียนนักผจญภัยแล้ว"}</p>}
          <Link href={needsRegistration ? registrationHref(returnTo) : returnTo} className={styles.continue}>{needsRegistration ? "ตรวจทะเบียนและไปต่อ" : "ไปต่อด้วยบัญชีนี้"} <Arrow /></Link>
          {providers.credentials ? <p><Link href={memberAccountHref(returnTo)}>ตั้งชื่อผู้ใช้หรือเปลี่ยนรหัสผ่าน</Link></p> : null}
          {needsDiscord ? <p className={styles.connectNotice}>{linkedProviders.discord ? "ยืนยันสิทธิ์ Discord อีกครั้งเพื่อเปิดกระเป๋าและใช้งานกิจกรรมของกิลด์" : "เชื่อมบัญชี Discord เพื่อเปิดกระเป๋า แลกเปลี่ยน และใช้งานกิจกรรมของกิลด์"}</p> : null}
          <button type="button" className={styles.signout} onClick={() => authenticate("signout")} disabled={!configured || pending !== null} aria-busy={pending === "signout"}>
            {pending === "signout" ? "กำลังออกจากระบบ…" : "ออกจากระบบสมาชิก"}
          </button>
        </div> : null}

        <button type="button" className={styles.login} onClick={() => authenticate("discord")} disabled={!providers.discord || pending !== null || credentialsPending || refreshing} aria-busy={pending === "discord"}>
          <FaDiscord aria-hidden="true" />
          {pending === "discord" ? "กำลังเปิด Discord…" : signedIn ? linkedProviders.discord ? "ยืนยันสิทธิ์ Discord อีกครั้ง" : "เชื่อมบัญชี Discord" : register ? "สมัครสมาชิกด้วย Discord" : "เข้าสู่ระบบด้วย Discord"}
        </button>
        <button type="button" className={`${styles.login} ${styles.google}`} onClick={() => authenticate("google")} disabled={!providers.google || signedIn && linkedProviders.google || pending !== null || credentialsPending || refreshing} aria-busy={pending === "google"}>
          <FcGoogle aria-hidden="true" />
          {pending === "google" ? "กำลังเปิด Google…" : signedIn ? linkedProviders.google ? "เชื่อม Google แล้ว" : "เชื่อมบัญชี Google" : register ? "สมัครสมาชิกด้วย Google" : "เข้าสู่ระบบด้วย Google"}
        </button>
        {!providers.discord && configured ? <p className={styles.notice}>Discord ยังไม่พร้อมใช้งานชั่วคราว</p> : null}
        {!providers.google && configured ? <p className={styles.notice}>Google ยังไม่พร้อมใช้งานในขณะนี้</p> : null}
        <p className={styles.notice}>{register
          ? "เลือก Discord หรือ Google ที่ยืนยันอีเมลแล้ว บัญชีใหม่จะเริ่มเป็นผู้มาเยือน"
          : signedIn ? "เชื่อมบัญชีเพื่อเข้าสู่สมาชิกคนเดิมได้ทั้งสองช่องทาง" : "เลือก Discord หรือ Google เพื่อเข้าสู่ระบบ"}</p>

        {!configured ? <div className={styles.unavailable}>
          <p role={error ? "alert" : "status"}>{error ?? "ขณะนี้ยังเชื่อมต่อระบบสมาชิกไม่ได้ โปรดลองอีกครั้งในภายหลัง"}</p>
          <button type="button" onClick={refreshStatus} disabled={refreshing} aria-busy={refreshing}>{refreshing ? "กำลังตรวจสอบ…" : "ตรวจสอบอีกครั้ง"}</button>
        </div> : null}
        {configured && error ? <div className={styles.message} role="alert"><p>{error}</p>{!signedIn && providers.credentials ? <Link href={memberAccountHref(returnTo)}>เข้าใช้บัญชีเดิมด้วยรหัสยืนยันทางอีเมล</Link> : null}</div> : null}
        <p className={styles.pending} role="status" aria-live="polite">
          {pending === "discord" ? "กำลังพาไปยืนยันตัวตนที่ Discord" : pending === "google" ? "กำลังพาไปยืนยันตัวตนที่ Google" : pending === "signout" ? "กำลังออกจากระบบสมาชิก" : ""}
        </p>

        {!signedIn && providers.credentials ? <MemberCredentialsLogin returnTo={returnTo} disabled={pending !== null || refreshing} onPendingChange={setCredentialsPending} /> : null}

        <div className={styles.divider} aria-hidden="true"><span>✦</span></div>
        <p className={styles.switch}>
          {register ? "เป็นสมาชิกอยู่แล้ว?" : "ยังไม่ได้เป็นสมาชิก?"}{" "}
          <Link href={memberAuthSwitchHref(register ? "login" : "register", returnTo)}>{register ? "เข้าสู่ระบบ" : "สมัครสมาชิก"} <Arrow /></Link>
        </p>

        <ul className={styles.benefits}>
          <li><span aria-hidden="true">✓</span> เลือกเข้าสู่ระบบด้วย Discord หรือ Google</li>
          <li><span aria-hidden="true">✓</span> ตรวจทะเบียนนักผจญภัยเดิม หรือสมัครใหม่หลังล็อกอิน</li>
          <li><span aria-hidden="true">✓</span> เชื่อม Discord เพื่อใช้กระเป๋าในชุมชน</li>
        </ul>
        <p className={styles.permissions}>Google ใช้ชื่อ อีเมล และรูปโปรไฟล์เพื่อยืนยันตัวตน ส่วน Discord ใช้ข้อมูลบัญชี รายชื่อเซิร์ฟเวอร์ และยศเพื่อยืนยันสิทธิ์ในกิลด์</p>
        {marketplace || raffle ? <p className={styles.footnote}>{marketplace ? "การเข้าสู่ระบบยังไม่แลกของหรือใช้ copper ทุกธุรกรรมต้องยืนยันอีกครั้ง" : "การเข้าสู่ระบบยังไม่ใช้ตั๋ว คุณเลือกส่งตั๋วเข้ากิจกรรมได้ภายหลัง"}</p> : null}
        <Link href="/adventure" className={styles.explore}>เริ่มต้นจากการสำรวจกิลด์ก็ได้ <Arrow /></Link>
      </section>
    </Motion>
    <footer className={styles.footer}>ME GUILD <span>พื้นที่ของคนรักเกมและการเรียนรู้</span></footer>
  </main>;
}
