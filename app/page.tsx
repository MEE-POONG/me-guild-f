import type { CSSProperties } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import {
  ArrowRight, CalendarDays, ChevronRight, CircleDot, Coins, Gamepad2,
  Headphones, Medal, MessageCircle, Mic2, Play, Radio, Search,
  ShieldCheck, Sparkles, Swords, Trophy, UserRoundPlus, UsersRound, Zap,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SiteControls } from "@/components/site-controls";
import { authOptions } from "@/lib/auth";
import { homeCopy } from "@/lib/home-copy";
import { normalizeLocale } from "@/lib/preferences";

const partyMeta = [
  { game: "VALORANT", mode: "Ranked • Ascendant", slots: "3 / 5", color: "lime" },
  { game: "APEX LEGENDS", mode: "Ranked • Platinum", slots: "2 / 3", color: "violet" },
  { game: "MONSTER HUNTER", mode: "High Rank • Co-op", slots: "2 / 4", color: "amber" },
];

const guildMeta = [
  { name: "NEON RONIN", game: "FPS • Competitive", monogram: "NR", accent: "#b7ff3c" },
  { name: "MOONLIT TAVERN", game: "RPG • Casual", monogram: "MT", accent: "#9b7cff" },
  { name: "SIAM TITANS", game: "MOBA • Tournament", monogram: "ST", accent: "#ffbd4a" },
];

const loopIcons = [Search, Headphones, Trophy, Zap];
const eventIcons = [CalendarDays, UsersRound, Coins];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get("mg_locale")?.value);
  const text = homeCopy[locale];
  const memberHref = session ? "/member" : "/login?callbackUrl=/member";

  return (
    <main className="min-h-dvh overflow-clip bg-ink text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-ink/78 backdrop-blur-xl">
        <div className="shell flex h-20 items-center justify-between gap-4">
          <Link href="#top" className="flex min-h-12 shrink-0 items-center gap-3" aria-label={text.home}>
            <BrandMark />
            <div className="leading-none"><span className="font-display text-lg font-bold tracking-[0.16em]">ME GUILD</span><span className="mt-1 block text-[0.58rem] font-semibold tracking-[0.31em] text-lime">PLAY AS ONE</span></div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-white/62 xl:flex" aria-label={text.menu}>
            <Link href="#parties" className="nav-link">{text.nav[0]}</Link><Link href="#guilds" className="nav-link">{text.nav[1]}</Link><Link href="#events" className="nav-link">{text.nav[2]}</Link><Link href="#progress" className="nav-link">{text.nav[3]}</Link>
          </nav>
          <div className="hidden items-center gap-2 sm:flex">
            <SiteControls />
            <Link href="/profile" className="button-ghost hidden lg:inline-flex">{text.profileStudio}</Link>
            <Link href={memberHref} className="button-primary">{session ? text.openHub : text.joinCommunity}<ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <details className="mobile-menu relative sm:hidden">
            <summary className="grid size-12 cursor-pointer list-none place-items-center rounded-xl border border-white/12 bg-white/5" aria-label={text.menu}><span className="space-y-1.5" aria-hidden="true"><i /><i /><i /></span></summary>
            <div className="absolute right-0 top-14 w-64 rounded-2xl border border-white/10 bg-[#10131b] p-3 shadow-2xl"><div className="mb-2 px-1"><SiteControls compact /></div><Link href="#parties">{text.nav[0]}</Link><Link href="#guilds">{text.nav[1]}</Link><Link href="#events">{text.nav[2]}</Link><Link href="/profile">{text.profileStudio}</Link><Link href="/login">{text.login}</Link></div>
          </details>
        </div>
      </header>

      <section id="top" className="hero-grid relative min-h-[860px] pt-20">
        <div className="hero-glow" aria-hidden="true" />
        <div className="shell relative grid min-h-[780px] items-center gap-16 py-20 lg:grid-cols-[1.04fr_.96fr] lg:py-24">
          <div className="relative z-10 pt-8">
            <div className="eyebrow mb-7"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-70" /><span className="relative inline-flex size-2 rounded-full bg-lime" /></span>{text.season}</div>
            <h1 className="max-w-4xl font-display text-[clamp(3.15rem,8.6vw,7.9rem)] font-bold uppercase leading-[0.82] tracking-[-0.065em]">{text.hero[0]}<span className="mt-2 block text-outline">{text.hero[1]}</span><span className="mt-2 block text-lime">{text.hero[2]}</span><span className="mt-2 block text-lime">{text.hero[3]}</span></h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/64 md:text-xl">{text.intro}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row"><Link href={memberHref} className="button-primary button-large"><Play size={18} fill="currentColor" aria-hidden="true" />{text.findPlayers}</Link><Link href="#parties" className="button-ghost button-large">{text.browseParties}<ChevronRight size={18} aria-hidden="true" /></Link></div>
            <div className="mt-12 grid gap-4 border-t border-white/9 pt-7 text-sm text-white/46 sm:flex sm:flex-wrap sm:items-center sm:gap-x-8"><span className="flex items-center gap-2"><ShieldCheck size={17} className="text-lime" /> {text.trust[0]}</span><span className="flex items-center gap-2"><Mic2 size={17} className="text-violet" /> {text.trust[1]}</span><span className="flex items-center gap-2"><Medal size={17} className="text-amber" /> {text.trust[2]}</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-[590px] lg:mx-0">
            <div className="hero-orbit" aria-hidden="true"><span /><span /><span /></div>
            <div className="command-card relative z-10">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-lime text-ink"><Gamepad2 size={21} strokeWidth={2.4} /></div><div><p className="font-display text-sm font-bold tracking-[0.15em]">MATCH COMMAND</p><p className="mt-0.5 text-xs text-white/40">{text.commandSubtitle}</p></div></div><span className="status-pill"><Radio size={12} /> LIVE</span></div>
              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-white/8 bg-black/28 p-4"><div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-white/38"><span>{text.partyReadiness}</span><span className="text-lime">80%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full w-4/5 rounded-full bg-lime shadow-[0_0_18px_rgba(183,255,60,.55)]" /></div><div className="mt-5 grid grid-cols-5 gap-2" aria-label={text.partyMembersAria}>{["AK", "N", "BB", "M"].map((name, index) => <div key={name} className={`avatar-tile ${index === 0 ? "avatar-lead" : ""}`}>{name}</div>)}<div className="avatar-tile border-dashed text-white/28"><UserRoundPlus size={18} /></div></div></div>
                <div className="grid gap-3 sm:grid-cols-2"><div className="data-tile"><span>GAME</span><strong>VALORANT</strong><small>Competitive • 5v5</small></div><div className="data-tile"><span>START</span><strong>20:45</strong><small>{text.startIn}</small></div><div className="data-tile"><span>SKILL RANGE</span><strong>DIAMOND+</strong><small>{text.teamAverage}</small></div><div className="data-tile"><span>VOICE</span><strong className="flex items-center gap-2"><CircleDot size={13} className="text-lime" /> CONNECTED</strong><small>{text.discordRoom}</small></div></div>
                <Link href={memberHref} className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white font-display text-sm font-bold tracking-[0.1em] text-ink transition hover:bg-lime">{text.joinParty} <ArrowRight size={17} /></Link>
              </div>
            </div>
            <div className="floating-chip chip-top"><span className="grid size-9 place-items-center rounded-lg bg-violet/20 text-violet"><MessageCircle size={18} /></span><span><b>+18</b><small>{text.newMessages}</small></span></div>
            <div className="floating-chip chip-bottom"><span className="grid size-9 place-items-center rounded-lg bg-lime/15 text-lime"><Trophy size={18} /></span><span><b>{text.wins}</b><small>{text.thisWeek}</small></span></div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-white/[.025]"><div className="shell grid grid-cols-2 divide-x divide-y divide-white/8 sm:grid-cols-4 sm:divide-y-0">{["12.8K", "486", "92", "38"].map((value, index) => <div key={value} className="px-5 py-8 text-center"><strong className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">{value}</strong><span className="mt-1 block text-xs font-medium text-white/42">{text.stats[index]}</span></div>)}</div></section>

      <section id="progress" className="shell py-24 md:py-32">
        <div className="section-heading"><div><p className="kicker">THE CORE LOOP</p><h2>{text.loopHeading[0]}<br /><span className="text-white/34">{text.loopHeading[1]}</span></h2></div><p>{text.loopDescription}</p></div>
        <div className="loop-grid mt-14">{text.loop.map((item, index) => { const Icon = loopIcons[index]; return <article key={item.title} className="loop-card"><div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-xl border border-white/10 bg-white/5 text-lime"><Icon size={23} /></span><span className="font-display text-sm font-bold text-white/20">0{index + 1}</span></div><h3>{item.title}</h3><p>{item.body}</p>{index < text.loop.length - 1 && <ArrowRight className="loop-arrow" size={20} aria-hidden="true" />}</article>; })}</div>
      </section>

      <section id="parties" className="relative border-y border-white/8 bg-[#0b0e14] py-24 md:py-32"><div className="section-radial" aria-hidden="true" /><div className="shell relative"><div className="section-heading"><div><p className="kicker">LIVE MATCHMAKING</p><h2>{text.partyHeading[0]}<br /><span className="text-lime">{text.partyHeading[1]}</span></h2></div><Link href={memberHref} className="text-link">{text.viewAll} <ArrowRight size={17} /></Link></div><div className="mt-14 grid gap-4 lg:grid-cols-3">{partyMeta.map((party, index) => { const localized = text.parties[index]; return <article key={party.game} className={`party-card party-${party.color}`}><div className="flex items-center justify-between"><span className="party-game">{party.game}</span><span className="flex items-center gap-1.5 text-xs font-semibold text-lime"><span className="size-1.5 rounded-full bg-lime" /> {text.open.toUpperCase()}</span></div><p className="mt-6 text-xs font-medium text-white/42">{party.mode}</p><h3 className="mt-2 font-display text-2xl font-semibold">{localized.title}</h3><div className="mt-5 flex flex-wrap gap-2">{localized.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}</div><div className="mt-7 flex items-end justify-between border-t border-white/8 pt-5"><div><span className="block text-xs text-white/36">{text.members}</span><strong className="font-display text-xl">{party.slots}</strong></div><div className="text-right"><span className="block text-xs text-white/36">{text.time}</span><strong className="text-sm">{localized.time}</strong></div></div><Link href={memberHref} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 font-display text-sm font-bold tracking-wider transition hover:border-lime/50 hover:bg-lime hover:text-ink">{text.requestJoin} <ChevronRight size={16} /></Link></article>; })}</div></div></section>

      <section id="guilds" className="shell py-24 md:py-32"><div className="section-heading"><div><p className="kicker">FIND YOUR HOME</p><h2>{text.guildHeading[0]}<br /><span className="text-violet">{text.guildHeading[1]}</span></h2></div><p>{text.guildDescription}</p></div><div className="mt-14 grid gap-4 lg:grid-cols-3">{guildMeta.map((guild, index) => <article key={guild.name} className="guild-card" style={{"--guild-accent": guild.accent} as CSSProperties}><div className="guild-banner"><span className="guild-emblem">{guild.monogram}</span><Sparkles className="absolute right-5 top-5 text-white/18" size={23} /></div><div className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/38">{guild.game}</p><h3 className="mt-2 font-display text-2xl font-bold tracking-wide">{guild.name}</h3><div className="mt-5 flex items-center justify-between text-sm"><span className="flex items-center gap-2 text-white/54"><UsersRound size={16} /> {text.guildMembers[index]}</span><span className="font-semibold text-[var(--guild-accent)]">{text.guildOpen[index]}</span></div></div></article>)}</div></section>

      <section id="events" className="border-y border-white/8 bg-white/[.025] py-24 md:py-28"><div className="shell grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="kicker">UPCOMING EVENT</p><h2 className="mt-3 font-display text-5xl font-bold leading-[.98] tracking-tight md:text-6xl">GUILD CLASH<br /><span className="text-amber">THAILAND</span></h2><p className="mt-6 max-w-md leading-7 text-white/54">{text.eventDescription}</p><Link href={memberHref} className="button-primary mt-8 inline-flex">{text.registerTeam} <ArrowRight size={17} /></Link></div><div className="event-card"><div className="event-art" aria-hidden="true"><Swords size={76} strokeWidth={1.2} /><span>01</span></div><div className="grid gap-4 p-6 sm:grid-cols-3">{text.eventMeta.map(([label, value], index) => { const Icon = eventIcons[index]; return <div key={label}><Icon size={18} className="text-amber" /><span>{label}</span><strong>{value}</strong></div>; })}</div></div></div></section>

      <section className="shell py-24 md:py-32"><div className="cta-panel"><div className="cta-grid" aria-hidden="true" /><div className="relative z-10 max-w-3xl"><p className="kicker text-ink/50">READY PLAYER?</p><h2 className="mt-4 font-display text-5xl font-bold leading-[.92] tracking-[-.04em] text-ink md:text-7xl">{text.ctaHeading[0]}<br />{text.ctaHeading[1]}</h2><p className="mt-6 max-w-xl text-base leading-7 text-ink/62">{text.ctaDescription}</p><Link href={memberHref} className="mt-8 inline-flex min-h-14 items-center gap-3 rounded-xl bg-ink px-6 font-display text-sm font-bold tracking-[.08em] text-white transition hover:-translate-y-0.5 hover:bg-[#171b25]">{session ? text.openHub : text.createProfile} <ArrowRight size={18} /></Link></div></div></section>

      <footer className="border-t border-white/8 py-10"><div className="shell flex flex-col gap-6 text-sm text-white/38 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-3"><BrandMark compact /><span className="font-display font-bold tracking-[.14em] text-white">ME GUILD</span></div><p>{text.footer}</p><p>© 2026 Me Guild</p></div></footer>
    </main>
  );
}
