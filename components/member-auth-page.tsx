import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MemberAuthForm, type MemberAuthMode } from "@/components/member-auth-form";
import { ProviderButtons } from "@/components/provider-buttons";

export function MemberAuthPage({ mode, title, description, email }: { mode: MemberAuthMode; title: string; description: string; email?: string }) {
  return <main className="hero-grid flex min-h-dvh items-center justify-center bg-ink px-5 py-12 text-white"><section className="relative w-full max-w-md rounded-2xl border border-white/10 bg-ink p-6 sm:p-8"><Link href="/" className="mb-8 flex items-center gap-3"><BrandMark /><span className="font-display font-bold tracking-widest">ME GUILD</span></Link><h1 className="text-3xl font-bold">{title}</h1><p className="mt-3 text-sm leading-6 text-white/55">{description}</p><MemberAuthForm mode={mode} initialEmail={email} />{mode === "register" && <ProviderButtons googleLabel="สมัครด้วย Google" discordLabel="สมัครด้วย Discord" />}</section></main>;
}
