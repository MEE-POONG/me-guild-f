import type { CSSProperties } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleDot,
  Coins,
  Gamepad2,
  Headphones,
  Leaf,
  Medal,
  MessageCircle,
  Mic2,
  Play,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UserRoundPlus,
  UsersRound,
  Zap,
} from "@/components/icons";
import { BrandMark } from "@/components/brand-mark";
import { GuildRetreatImage } from "@/components/guild-retreat-image";
import { InteractiveGuildCrest } from "@/components/interactive-guild-crest";
import { SiteControls } from "@/components/site-controls";
import { authOptions } from "@/lib/auth";
import { homeCopy } from "@/lib/home-copy";
import { normalizeLocale } from "@/lib/preferences";
import styles from "./home.module.css";

const partyMeta = [
  { game: "VALORANT", mode: "Ranked • Ascendant", slots: "3 / 5", color: "sage" },
  { game: "APEX LEGENDS", mode: "Ranked • Platinum", slots: "2 / 3", color: "lilac" },
  { game: "MONSTER HUNTER", mode: "High Rank • Co-op", slots: "2 / 4", color: "gold" },
] as const;

const guildMeta = [
  { name: "NEON RONIN", game: "FPS • Competitive", monogram: "NR", accent: "#5f916d" },
  { name: "MOONLIT TAVERN", game: "RPG • Casual", monogram: "MT", accent: "#8c78b8" },
  { name: "SIAM TITANS", game: "MOBA • Tournament", monogram: "ST", accent: "#c48b45" },
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
    <main className={styles.home}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <div className={styles.pageFrame}>
        <header className={styles.header}>
          <div className={`${styles.shell} ${styles.headerInner}`}>
            <Link href="#top" className={styles.brand} aria-label={text.home}>
              <BrandMark />
              <span className={styles.brandCopy}>
                <strong>ME GUILD</strong>
                <small>YOUR COZY PARTY HOME</small>
              </span>
            </Link>

            <nav className={styles.desktopNav} aria-label={text.menu}>
              <Link href="#parties">{text.nav[0]}</Link>
              <Link href="#guilds">{text.nav[1]}</Link>
              <Link href="#events">{text.nav[2]}</Link>
              <Link href="#progress">{text.nav[3]}</Link>
            </nav>

            <div className={styles.headerActions}>
              <SiteControls />
              <Link href="/profile" className={styles.quietButton}>{text.profileStudio}</Link>
              <Link href={memberHref} className={styles.primaryButton}>
                {session ? text.openHub : text.joinCommunity}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>

            <details className={styles.mobileMenu}>
              <summary aria-label={text.menu}>
                <span aria-hidden="true"><i /><i /><i />
                </span>
              </summary>
              <div className={styles.mobileMenuPanel}>
                <SiteControls compact />
                <nav aria-label={text.menu}>
                  <Link href="#parties">{text.nav[0]}</Link>
                  <Link href="#guilds">{text.nav[1]}</Link>
                  <Link href="#events">{text.nav[2]}</Link>
                  <Link href="#progress">{text.nav[3]}</Link>
                  <Link href="/profile">{text.profileStudio}</Link>
                  <Link href={memberHref}>{session ? text.openHub : text.login}</Link>
                </nav>
              </div>
            </details>
          </div>
        </header>

        <div id="main-content">
          <section id="top" className={styles.hero}>
            <div className={styles.heroVisual} aria-hidden="true">
              <GuildRetreatImage />
              <div className={styles.heroVeil} />
            </div>
            <div className={styles.fireflies} aria-hidden="true">
              <i /><i /><i /><i /><i /><i />
            </div>

            <div className={`${styles.shell} ${styles.heroLayout}`}>
              <div className={styles.heroCopy}>
                <p className={styles.eyebrow}><Leaf size={15} aria-hidden="true" />{text.season}</p>
                <h1>
                  <span>{text.hero[0]} {text.hero[1]}</span>
                  <em>{text.hero[2]} {text.hero[3]}</em>
                </h1>
                <p className={styles.heroIntro}>{text.intro}</p>
                <div className={styles.heroActions}>
                  <Link href={memberHref} className={styles.primaryButton}>
                    <Play size={17} fill="currentColor" aria-hidden="true" />
                    {text.findPlayers}
                  </Link>
                  <Link href="#parties" className={styles.quietButton}>
                    {text.browseParties}
                    <ChevronRight size={17} aria-hidden="true" />
                  </Link>
                </div>
                <ul className={styles.trustList} aria-label="Community features">
                  <li><ShieldCheck size={17} aria-hidden="true" />{text.trust[0]}</li>
                  <li><Mic2 size={17} aria-hidden="true" />{text.trust[1]}</li>
                  <li><Medal size={17} aria-hidden="true" />{text.trust[2]}</li>
                </ul>
              </div>

              <InteractiveGuildCrest />
            </div>
          </section>

          <section className={styles.partyDockSection} aria-label={text.commandSubtitle}>
            <div className={styles.shell}>
              <details className={styles.partyDock}>
                <summary className={styles.partyDockSummary}>
                  <span className={styles.boardIcon}><Gamepad2 size={21} aria-hidden="true" />
                  </span>
                  <span className={styles.partyDockCopy}>
                    <small>PARTY NOTICE</small>
                    <strong>{text.commandSubtitle}</strong>
                  </span>
                  <span className={styles.partyDockReadiness}><b>80%</b> {text.partyReadiness}</span>
                  <span className={styles.liveStatus}><Radio size={12} aria-hidden="true" /> LIVE</span>
                  <ChevronRight className={styles.partyDockChevron} size={18} aria-hidden="true" />
                </summary>

                <aside className={styles.partyBoard} aria-label={text.commandSubtitle}>
                  <div className={styles.readiness}>
                    <span>{text.partyReadiness}</span>
                    <strong>80%</strong>
                    <div className={styles.progressTrack} aria-hidden="true"><i />
                    </div>
                  </div>

                  <div className={styles.partyMembers} aria-label={text.partyMembersAria}>
                    {["AK", "N", "BB", "M"].map((name, index) => (
                      <span key={name} className={index === 0 ? styles.partyLeader : undefined}>{name}</span>
                    ))}
                    <span><UserRoundPlus size={18} aria-hidden="true" />
                    </span>
                  </div>

                  <dl className={styles.matchDetails}>
                    <div><dt>GAME</dt><dd>VALORANT</dd><small>Competitive • 5v5</small></div>
                    <div><dt>START</dt><dd>20:45</dd><small>{text.startIn}</small></div>
                    <div><dt>SKILL RANGE</dt><dd>DIAMOND+</dd><small>{text.teamAverage}</small></div>
                    <div><dt>VOICE</dt><dd><CircleDot size={12} aria-hidden="true" /> CONNECTED</dd><small>{text.discordRoom}</small></div>
                  </dl>

                  <Link href={memberHref} className={styles.boardButton}>
                    {text.joinParty}<ArrowRight size={17} aria-hidden="true" />
                  </Link>

                  <div className={styles.boardNotes}>
                    <span><MessageCircle size={15} aria-hidden="true" /><b>+18</b> {text.newMessages}</span>
                    <span><Trophy size={15} aria-hidden="true" /><b>{text.wins}</b> {text.thisWeek}</span>
                  </div>
                </aside>
              </details>
            </div>
          </section>

          <section className={styles.statsBand} aria-label="Community statistics">
            <div className={`${styles.shell} ${styles.statsGrid}`}>
              {["12.8K", "486", "92", "38"].map((value, index) => (
                <div key={value}>
                  <strong>{value}</strong>
                  <span>{text.stats[index]}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="progress" className={`${styles.shell} ${styles.section}`}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.kicker}>YOUR GUILD PATH</p>
                <h2>{text.loopHeading[0]}<br /><span>{text.loopHeading[1]}</span></h2>
              </div>
              <p>{text.loopDescription}</p>
            </div>

            <ol className={styles.journey}>
              {text.loop.map((item, index) => {
                const Icon = loopIcons[index];
                return (
                  <li key={item.title}>
                    <span className={styles.journeyIcon}><Icon size={22} aria-hidden="true" />
                    </span>
                    <small>0{index + 1}</small>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </li>
                );
              })}
            </ol>
          </section>

          <section id="parties" className={styles.noticeSection}>
            <div className={`${styles.shell} ${styles.noticeInner}`}>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.kicker}>LIVE QUEST BOARD</p>
                  <h2>{text.partyHeading[0]}<br /><span>{text.partyHeading[1]}</span></h2>
                </div>
                <Link href={memberHref} className={styles.textLink}>{text.viewAll}<ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>

              <div className={styles.partyGrid}>
                {partyMeta.map((party, index) => {
                  const localized = text.parties[index];
                  return (
                    <article key={party.game} className={styles.partyCard} data-accent={party.color}>
                      <div className={styles.partyCardTop}>
                        <span>{party.game}</span>
                        <span><i />{text.open}</span>
                      </div>
                      <p className={styles.partyMode}>{party.mode}</p>
                      <h3>{localized.title}</h3>
                      <div className={styles.tags}>{localized.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                      <dl className={styles.partyMeta}>
                        <div><dt>{text.members}</dt><dd>{party.slots}</dd></div>
                        <div><dt>{text.time}</dt><dd>{localized.time}</dd></div>
                      </dl>
                      <Link href={memberHref}>{text.requestJoin}<ChevronRight size={16} aria-hidden="true" />
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="guilds" className={`${styles.shell} ${styles.section}`}>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.kicker}>FIND YOUR HOME</p>
                <h2>{text.guildHeading[0]}<br /><span>{text.guildHeading[1]}</span></h2>
              </div>
              <p>{text.guildDescription}</p>
            </div>

            <div className={styles.guildGrid}>
              {guildMeta.map((guild, index) => (
                <article key={guild.name} className={styles.guildCard} style={{ "--guild-accent": guild.accent } as CSSProperties}>
                  <div className={styles.guildBanner} aria-hidden="true">
                    <i /><i /><i />
                    <span>{guild.monogram}</span>
                    <Sparkles size={22} />
                  </div>
                  <div className={styles.guildCopy}>
                    <p>{guild.game}</p>
                    <h3>{guild.name}</h3>
                    <div>
                      <span><UsersRound size={16} aria-hidden="true" />{text.guildMembers[index]}</span>
                      <strong>{text.guildOpen[index]}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="events" className={styles.eventSection}>
            <div className={`${styles.shell} ${styles.eventLayout}`}>
              <div className={styles.eventCopy}>
                <p className={styles.kicker}>SEASONAL FESTIVAL</p>
                <h2>GUILD CLASH<br /><span>THAILAND</span></h2>
                <p>{text.eventDescription}</p>
                <Link href={memberHref} className={styles.primaryButton}>{text.registerTeam}<ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>

              <article className={styles.eventCard}>
                <div className={styles.eventSeal} aria-hidden="true">
                  <Swords size={64} strokeWidth={1.35} />
                  <span>01</span>
                </div>
                <dl>
                  {text.eventMeta.map(([label, value], index) => {
                    const Icon = eventIcons[index];
                    return (
                      <div key={label}>
                        <Icon size={19} aria-hidden="true" />
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    );
                  })}
                </dl>
              </article>
            </div>
          </section>

          <section className={`${styles.shell} ${styles.ctaSection}`}>
            <div className={styles.ctaPanel}>
              <div className={styles.ctaLeaves} aria-hidden="true"><Leaf /><Leaf /><Sparkles />
              </div>
              <div>
                <p className={styles.kicker}>YOUR STORY STARTS HERE</p>
                <h2>{text.ctaHeading[0]}<br />{text.ctaHeading[1]}</h2>
                <p>{text.ctaDescription}</p>
                <Link href={memberHref} className={styles.ctaButton}>
                  {session ? text.openHub : text.createProfile}<ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          <footer className={styles.footer}>
            <div className={`${styles.shell} ${styles.footerInner}`}>
              <div className={styles.footerBrand}><BrandMark compact /><strong>ME GUILD</strong></div>
              <p>{text.footer}</p>
              <p>© 2026 Me Guild</p>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}

