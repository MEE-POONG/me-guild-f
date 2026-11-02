"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FaDiscord } from "react-icons/fa";
import { Arrow, GuildBrand } from "@/container/public/guild-brand";
import { GuildTilt, Motion } from "@/container/public/motion";
import { endAdventureMemberSession, startAdventureDiscordLogin } from "@/lib/adventure-member-login";
import { memberAuthSwitchHref, type MemberAuthMode } from "@/lib/member-auth-page";
import styles from "./member-login.module.css";

type MemberLoginProps = {
  mode?: MemberAuthMode;
  configured: boolean;
  returnTo: string;
  initialError: string | null;
  currentDisplayName?: string | null;
};

export function AdventureMemberLogin({ mode = "login", configured, returnTo, initialError, currentDisplayName = null }: MemberLoginProps) {
  const register = mode === "register";
  const marketplace = returnTo.split(/[?#]/)[0] === "/adventure/marketplace";
  const raffle = returnTo.split(/[?#]/)[0] === "/adventure/raffles";
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [pending, setPending] = useState<"signin" | "signout" | null>(null);
  const [actionResult, setActionResult] = useState<{ error: string | null } | null>(null);
  const error = actionResult === null ? initialError : actionResult.error;
  const inFlight = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; inFlight.current?.abort(); };
  }, []);

  async function authenticate(action: "signin" | "signout") {
    if (!configured || inFlight.current || pending !== null) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const timer = setTimeout(() => controller.abort("timeout"), 15_000);
    setPending(action);
    setActionResult({ error: null });
    try {
      const dependencies = { origin: window.location.origin, fetch, signal: controller.signal };
      const target = action === "signout"
        ? await endAdventureMemberSession(dependencies)
        : await startAdventureDiscordLogin(returnTo, dependencies);
      if (!controller.signal.aborted) window.location.assign(target);
    } catch {
      if (mounted.current && (!controller.signal.aborted || controller.signal.reason === "timeout")) {
        setActionResult({ error: action === "signout" ? "ยังออกจากระบบสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" : "ยังเปิดประตู Discord ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
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
          ? "มาเป็นส่วนหนึ่งของกิลด์ พบเพื่อนใหม่ และเติบโตไปด้วยกัน"
          : marketplace ? "กลับมาเปิดกระเป๋า แลกเปลี่ยนกับเพื่อน และติดตามการประมูลของคุณ"
            : raffle ? "กลับมาดูตั๋วของคุณ และร่วมกิจกรรมที่เปิดรับในกิลด์"
              : "กลับมาพบเพื่อนและไปต่อกับการผจญภัยของคุณ"}</p>

        {currentDisplayName !== null ? <div className={styles.account}>
          <p>คุณเข้าสู่ระบบอยู่แล้วในชื่อ <strong>{currentDisplayName}</strong></p>
          <Link href={returnTo} className={styles.continue}>ไปต่อด้วยบัญชีนี้ <Arrow /></Link>
          <button type="button" className={styles.signout} onClick={() => authenticate("signout")} disabled={!configured || pending !== null} aria-busy={pending === "signout"}>
            {pending === "signout" ? "กำลังออกจากระบบ…" : "ออกจากระบบสมาชิก"}
          </button>
        </div> : null}

        <button type="button" className={styles.login} onClick={() => authenticate("signin")} disabled={!configured || pending !== null || refreshing} aria-busy={pending === "signin"}>
          <FaDiscord aria-hidden="true" />
          {pending === "signin" ? "กำลังเปิด Discord…" : currentDisplayName !== null ? "ยืนยันสิทธิ์ Discord อีกครั้ง" : register ? "สมัครสมาชิกด้วย Discord" : "เข้าสู่ระบบด้วย Discord"}
        </button>
        <p className={styles.notice}>{register
          ? "ใช้ Discord ที่ยืนยันอีเมลแล้ว ระบบจะสร้างบัญชีสมาชิกเมื่อยืนยันตัวตนสำเร็จครั้งแรก หากมีบัญชีแล้วจะเข้าสู่บัญชีเดิม"
          : "ใช้ Discord บัญชีเดียวกับที่คุณใช้ในชุมชน"}</p>

        {!configured ? <div className={styles.unavailable}>
          <p role={error ? "alert" : "status"}>{error ?? "ขณะนี้ยังเชื่อมต่อระบบสมาชิกไม่ได้ โปรดลองอีกครั้งในภายหลัง"}</p>
          <button type="button" onClick={refreshStatus} disabled={refreshing} aria-busy={refreshing}>{refreshing ? "กำลังตรวจสอบ…" : "ตรวจสอบอีกครั้ง"}</button>
        </div> : null}
        {configured && error ? <p className={styles.message} role="alert">{error}</p> : null}
        <p className={styles.pending} role="status" aria-live="polite">
          {pending === "signin" ? "กำลังพาไปยืนยันตัวตนที่ Discord" : pending === "signout" ? "กำลังออกจากระบบสมาชิก" : ""}
        </p>

        <div className={styles.divider} aria-hidden="true"><span>✦</span></div>
        <p className={styles.switch}>
          {register ? "เป็นสมาชิกอยู่แล้ว?" : "ยังไม่ได้เป็นสมาชิก?"}{" "}
          <Link href={memberAuthSwitchHref(register ? "login" : "register", returnTo)}>{register ? "เข้าสู่ระบบ" : "สมัครสมาชิก"} <Arrow /></Link>
        </p>

        <ul className={styles.benefits}>
          <li><span aria-hidden="true">✓</span> บัญชีเดียวกับที่ใช้ในชุมชน</li>
          <li><span aria-hidden="true">✓</span> ยืนยันตัวตนผ่าน Discord</li>
        </ul>
        <p className={styles.permissions}>ระบบขออ่านชื่อ อีเมล รายชื่อเซิร์ฟเวอร์ และสถานะสมาชิกกับยศในเซิร์ฟเวอร์ เพื่อยืนยันตัวตนและสิทธิ์เข้าร่วมกิจกรรม</p>
        {marketplace || raffle ? <p className={styles.footnote}>{marketplace ? "การเข้าสู่ระบบยังไม่แลกของหรือใช้ copper ทุกธุรกรรมต้องยืนยันอีกครั้ง" : "การเข้าสู่ระบบยังไม่ใช้ตั๋ว คุณเลือกส่งตั๋วเข้ากิจกรรมได้ภายหลัง"}</p> : null}
        <Link href="/adventure" className={styles.explore}>เริ่มต้นจากการสำรวจกิลด์ก็ได้ <Arrow /></Link>
      </section>
    </Motion>
    <footer className={styles.footer}>ME GUILD <span>พื้นที่ของคนรักเกมและการเรียนรู้</span></footer>
  </main>;
}
