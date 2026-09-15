import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, Check, LockKeyhole, Sparkles } from "@/components/icons";
import { BrandMark } from "@/components/brand-mark";
import { AuthError, MemberAuthForm } from "@/components/member-auth-form";
import { safeReturnPath } from "@/lib/member-security";
import { ProviderButtons } from "@/components/provider-buttons";
import { SiteControls } from "@/components/site-controls";
import { accountCopy } from "@/lib/account-copy";
import { authOptions } from "@/lib/auth";
import { normalizeLocale } from "@/lib/preferences";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const callbackUrl = safeReturnPath(params.callbackUrl);
  if (session?.user?.id) redirect(callbackUrl);
  const locale = normalizeLocale((await cookies()).get("mg_locale")?.value);
  const text = accountCopy[locale].login;

  return <main className="relative grid min-h-dvh overflow-hidden bg-ink lg:grid-cols-[1.05fr_.95fr]">
    <div className="hero-grid relative hidden border-r border-white/8 p-12 lg:flex lg:flex-col lg:justify-between"><div className="hero-glow" aria-hidden="true" /><Link href="/" className="relative z-10 flex w-fit items-center gap-3"><BrandMark /><span className="font-display text-lg font-bold tracking-[.16em]">ME GUILD</span></Link><div className="relative z-10 max-w-xl pb-10"><p className="kicker">YOUR NEXT CHAPTER</p><h1 className="mt-5 font-display text-6xl font-bold uppercase leading-[.9] tracking-[-.05em]">Join the squad.<br /><span className="text-lime">Own the story.</span></h1><p className="mt-6 max-w-lg text-lg leading-8 text-white/52">{text.pitch}</p><ul className="mt-9 grid gap-4 text-sm text-white/64">{text.benefits.map(item => <li key={item} className="flex items-center gap-3"><span className="grid size-6 place-items-center rounded-full bg-lime/12 text-lime"><Check size={14} />
    </span>{item}</li>)}</ul></div><p className="relative z-10 text-xs text-white/28">ME GUILD IDENTITY SERVICE</p></div>
    <div className="relative flex items-center justify-center p-5 sm:p-10"><div className="absolute inset-x-5 top-5 flex items-center justify-between sm:inset-x-10 sm:top-8"><Link href="/" className="flex min-h-12 items-center gap-2 text-sm text-white/46 transition hover:text-white"><ArrowLeft size={17} /> {text.back}</Link><SiteControls compact />
    </div><section className="w-full max-w-md pt-20 lg:pt-0"><div className="mb-9 lg:hidden"><BrandMark /><p className="mt-5 font-display text-3xl font-bold">ME GUILD</p></div><div className="mb-8 flex items-start justify-between gap-4"><div><p className="kicker">{text.kicker}</p><h2 className="mt-3 font-display text-4xl font-bold tracking-tight">{text.heading}</h2><p className="mt-2 text-sm leading-6 text-white/45">{text.intro}</p></div><span className="grid size-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-lime"><Sparkles size={21} />
    </span></div><AuthError error={params.error} /><MemberAuthForm mode="login" callbackUrl={callbackUrl} /><ProviderButtons callbackUrl={callbackUrl} googleLabel={text.google} discordLabel={text.discord} /><div className="my-7 flex items-center gap-3 text-[.68rem] font-semibold uppercase tracking-[.16em] text-white/26"><span className="h-px flex-1 bg-white/8" /> {text.secure} <span className="h-px flex-1 bg-white/8" />
        </div><div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[.025] p-4"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-lime" /><p className="text-xs leading-5 text-white/38">{text.privacy}</p></div><p className="mt-7 text-center text-xs leading-5 text-white/28">{text.consent} <Link href="#" className="text-white/52 underline underline-offset-4">{text.terms}</Link> &amp; <Link href="#" className="text-white/52 underline underline-offset-4">{text.policy}</Link></p></section></div>
  </main>;
}

