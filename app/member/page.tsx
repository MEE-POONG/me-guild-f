import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowRight, CalendarDays, Gamepad2, Palette, ShieldCheck, Sparkles, Swords, UsersRound, Zap } from "@/components/icons";
import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteControls } from "@/components/site-controls";
import { accountCopy } from "@/lib/account-copy";
import { authOptions } from "@/lib/auth";
import { normalizeLocale } from "@/lib/preferences";

export const metadata = { title: "Member Hub" };

const taskIcons = [ShieldCheck, Gamepad2, UsersRound];
const actionIcons = [Swords, UsersRound, CalendarDays, Palette];
const actionColors = ["text-lime", "text-violet", "text-amber", "text-sky-300"];
const actionHrefs = ["/#parties", "/#guilds", "/#events", "/profile"];

export default async function MemberPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=/member");
  const locale = normalizeLocale((await cookies()).get("mg_locale")?.value);
  const text = accountCopy[locale].member;
  const firstName = session.user.name?.split(" ")[0] ?? "Player";

  return <main className="min-h-dvh bg-ink text-white">
    <header className="border-b border-white/8 bg-[#0b0e14]"><div className="shell flex min-h-20 items-center justify-between gap-3"><Link href="/" className="flex items-center gap-3"><BrandMark /><span className="hidden font-display font-bold tracking-[.13em] sm:inline">ME GUILD</span></Link><div className="flex items-center gap-2"><SiteControls compact persistToAccount /><div className="hidden text-right md:block"><p className="text-sm font-semibold">{session.user.name}</p><p className="text-xs text-white/35">{session.user.provider ?? "member"}</p></div><div className="grid size-11 place-items-center rounded-xl bg-violet/15 font-display font-bold text-violet">{firstName.slice(0, 2).toUpperCase()}</div><SignOutButton label={text.signOut} />
    </div></div></header>
    <div className="shell py-10 md:py-14"><div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"><div><p className="kicker">MEMBER HUB</p><h1 className="mt-3 font-display text-4xl font-bold md:text-6xl">{text.welcome}, <span className="text-lime">{firstName}</span></h1><p className="mt-3 text-white/45">{text.intro}</p></div><Link href="/" className="button-ghost">{text.community} <ArrowRight size={17} />
    </Link></div>
      <section className="mt-10 grid gap-4 lg:grid-cols-[1.35fr_.65fr]"><div className="rounded-2xl border border-lime/20 bg-lime/[.055] p-6 md:p-8"><div className="flex items-start justify-between"><div><p className="font-display text-xs font-bold uppercase tracking-[.16em] text-lime">{text.quest}</p><h2 className="mt-3 font-display text-2xl font-bold md:text-3xl">{text.questTitle}</h2></div><Zap className="text-lime" />
      </div><div className="mt-8 h-2 rounded-full bg-white/8"><div className="h-full w-1/3 rounded-full bg-lime" />
        </div><p className="mt-3 text-xs text-white/38">{text.progress}</p><div className="mt-7 grid gap-3 sm:grid-cols-3">{text.tasks.map(([label, state], index) => { const Icon = taskIcons[index]; return <div key={label} className="rounded-xl border border-white/8 bg-black/20 p-4"><Icon className={index === 0 ? "text-lime" : "text-white/32"} size={20} /><p className="mt-4 text-sm font-semibold">{label}</p><p className={`mt-1 text-xs ${index === 0 ? "text-lime" : "text-white/32"}`}>{state}</p></div>; })}</div></div>
        <div className="rounded-2xl border border-white/9 bg-white/[.025] p-6"><p className="font-display text-xs font-bold uppercase tracking-[.15em] text-white/35">{text.status}</p><div className="mt-6 grid place-items-center"><div className="grid size-28 place-items-center rounded-full border border-violet/35 bg-violet/10 text-center"><span><b className="block font-display text-3xl text-violet">01</b><small className="text-[.62rem] text-white/38">LEVEL</small></span></div></div><div className="mt-6 grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-white/4 p-3"><strong className="font-display text-xl">0</strong><span className="block text-[.65rem] text-white/34">MATCHES</span></div><div className="rounded-xl bg-white/4 p-3"><strong className="font-display text-xl">100</strong><span className="block text-[.65rem] text-white/34">XP</span></div></div></div></section>
      <section className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{text.actions.map(([title, body], index) => {
        const Icon = actionIcons[index]; return <Link key={title} href={actionHrefs[index]} className="group min-h-44 rounded-2xl border border-white/8 bg-white/[.025] p-5 text-left transition hover:-translate-y-1 hover:border-white/18 hover:bg-white/[.045]"><Icon className={actionColors[index]} /><h3 className="mt-8 font-display text-xl font-bold">{title}</h3><p className="mt-1 text-sm text-white/37">{body}</p><ArrowRight className="mt-5 text-white/24 transition group-hover:translate-x-1 group-hover:text-white" size={18} />
        </Link>;
      })}</section>
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-violet/18 bg-violet/[.045] p-4 text-sm text-white/48"><Sparkles className="shrink-0 text-violet" size={18} /><p>{text.notice}</p></div>
    </div>
  </main>;
}
