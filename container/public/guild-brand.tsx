import Link from "next/link";
import styles from "./public-home.module.css";

export function Compass({ className }: { className?: string }) {
  return <svg className={className} width="42" height="42" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1" />
    <path d="M24 2 28 20 46 24 28 28 24 46 20 28 2 24 20 20 24 2Z" stroke="currentColor" strokeWidth="1.2" />
    <path d="m24 4 0 20 4-4-4-16Zm20 20H24l4 4 16-4ZM24 44V24l-4 4 4 16ZM4 24h20l-4-4-16 4Z" fill="currentColor" />
    <path d="m12 12 8 8m8 8 8 8m0-24-8 8m-8 8-8 8" stroke="currentColor" />
  </svg>;
}

export function Arrow({ className }: { className?: string }) {
  return <svg className={className} width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function GuildBrand({ className }: { className?: string }) {
  return <Link href="/" className={`${styles.brand} ${className ?? ""}`} aria-label="Me Guild หน้าหลัก"><Compass /><span>ME GUILD</span></Link>;
}
