import Link from "next/link";
import { Compass, GuildBrand } from "@/container/public/guild-brand";
import styles from "./member-login.module.css";

export function MemberLoginLoading() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <GuildBrand className={styles.brand} />
      <Link href="/" className={styles.home}>กลับหน้าหลัก</Link>
    </header>
    <div className={styles.loading}>
      <Compass />
      <p role="status" aria-live="polite">กำลังเปิดประตูสมาชิก…</p>
    </div>
  </main>;
}
