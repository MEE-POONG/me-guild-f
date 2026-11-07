"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { animate, createScope, stagger } from "animejs";
import Tilt from "react-parallax-tilt";
import {
  GiCastle, GiCompass, GiCrossedSwords, GiFeather, GiKnapsack,
  GiMoon, GiOpenBook, GiPlayerBase, GiScrollUnfurled,
  GiSettingsKnobs, GiSparkles, GiLaurels, GiTicket,
} from "react-icons/gi";
import { guilds, newsPosts, quests, type NewsCategory, type NewsPost } from "./adventure-data";
import styles from "./adventure-hub.module.css";
import { useAdventureProgression, type ProgressionMode } from "./use-adventure-progression";
import { AdventureDialogs } from "./adventure-dialogs";
import { CommunityCommons } from "./community-commons";
import { useRealLifeSkills } from "./use-real-life-skills";
type CommunityView = "games" | "rewards" | "guild" | "knowledge" | "achievements";
type Panel = "status" | "inventory" | "guilds" | "quests" | "settings" | "news" | null;
const categories = ["ทั้งหมด", "ประกาศ", "กิจกรรม", "อัปเดต"] as const;
const subscribeMotion = (callback: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

function Arrow({ small = false }: { small?: boolean }) {
  return <svg width={small ? 16 : 21} height="18" viewBox="0 0 24 20" fill="none" aria-hidden="true"><path d="M3 10h17m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function NewsSymbol({ category }: { category: NewsCategory }) {
  return category === "กิจกรรม" ? <GiMoon /> : category === "ประกาศ" ? <GiFeather /> : <GiOpenBook />;
}

export function AdventureHub({ initialCommunityView = "games", memberAuthError = null, initialPanel, initialProgressionMode = "demo" }: { initialCommunityView?: CommunityView; memberAuthError?: string | null; initialPanel?: "status"; initialProgressionMode?: ProgressionMode }) {
  const root = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>(initialPanel ?? null);
  const progression = useAdventureProgression(initialProgressionMode, memberAuthError);
  const { state: skillState } = useRealLifeSkills();
  const realSkills = skillState.kind === "ready" ? skillState.snapshot : null;
  const playerProgress = progression.snapshot;
  const isVisitor = skillState.kind === "visitor";
  const levelLabel = realSkills ? `LV. ${realSkills.level}` : isVisitor ? "ผู้มาเยือน" : skillState.kind === "loading" ? "LV. …" : "LV. —";
  const skillsLink = skillState.kind === "anonymous" ? "/adventure/login?returnTo=%2Fadventure%2Fskills" : isVisitor ? "/adventure/register?returnTo=%2Fadventure%2Fskills" : "/adventure/skills";
  const skillLabel = realSkills ? `คลาส ${realSkills.grade} · ${realSkills.percent.toLocaleString("th-TH")}%` : isVisitor ? "ลงทะเบียนนักผจญภัย · เริ่มเลเวล 1" : skillState.kind === "loading" ? "กำลังเปิดบันทึกทักษะ" : skillState.kind === "anonymous" ? "เข้าสู่ระบบเพื่อดู Lv" : "บันทึกยังไม่พร้อม · ลองใหม่";
  const xpLabel = playerProgress ? playerProgress.isMaxLevel ? "MAX LEVEL" : `${playerProgress.xpIntoLevel.toLocaleString("en-US")} / ${(playerProgress.xpForNextLevel ?? 0).toLocaleString("en-US")}` : "— / —";
  const [selectedNews, setSelectedNews] = useState<NewsPost | null>(null);
  const [category, setCategory] = useState<(typeof categories)[number]>("ทั้งหมด");
  const [showAllNews, setShowAllNews] = useState(false);
  const [joinedGuild, setJoinedGuild] = useState<string | null>(null);
  const [acceptedQuests, setAcceptedQuests] = useState<string[]>([]);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [activeNav, setActiveNav] = useState(initialCommunityView === "games" ? "home" : `community-${initialCommunityView}`);
  const [communityView, setCommunityView] = useState<CommunityView>(initialCommunityView);
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const canAnimate = motionEnabled && !reducedMotion;
  const visibleNews = (category === "ทั้งหมด" ? newsPosts : newsPosts.filter((post) => post.category === category)).slice(0, showAllNews ? undefined : 3);
  const featuredGuild = guilds.find((guild) => guild.id === (joinedGuild ?? "moonleaf")) ?? guilds[0];

  useEffect(() => {
    if (!root.current || !canAnimate) return;
    const scope = createScope({ root }).add(() => {
      animate("[data-reveal]", { opacity: [0, 1], y: [15, 0], duration: 750, delay: stagger(65), ease: "outExpo" });
    });
    return () => scope.revert();
  }, [canAnimate]);

  const openPanel = (next: Panel) => setPanel(next);
  const goToNews = () => {
    setActiveNav("news");
    document.getElementById("adventure-news")?.scrollIntoView({ behavior: canAnimate ? "smooth" : "instant", block: "start" });
  };
  const goHome = () => {
    setActiveNav("home");
    window.scrollTo({ top: 0, behavior: canAnimate ? "smooth" : "instant" });
  };
  const readPost = (post: NewsPost) => { setSelectedNews(post); setPanel("news"); };
  const acceptQuest = (id: string) => setAcceptedQuests((previous) => previous.includes(id) ? previous : [...previous, id]);
  const goToCommunity = (view: CommunityView) => {
    setCommunityView(view);
    setActiveNav(`community-${view}`);
    document.getElementById("community")?.scrollIntoView({ behavior: canAnimate ? "smooth" : "instant", block: "start" });
  };

  return (
    <div className={styles.world} ref={root} data-motion={canAnimate ? "on" : "off"}>
      <a className={styles.skipLink} href="#adventure-main">ข้ามไปยังเนื้อหา</a>
      <header className={styles.header}>
        <button className={styles.brand} onClick={goHome} aria-label="Me Guild กลับศูนย์บัญชาการ">
          <GiCompass className={styles.brandMark} aria-hidden="true" /><span>Me Guild</span>
        </button>
        <nav className={styles.topNav} aria-label="เมนูหลัก">
          <GiSparkles className={styles.navStar} aria-hidden="true" />
          <button onClick={goHome} className={activeNav === "home" ? styles.topActive : ""}>โลกของเรา</button>
          <button onClick={goToNews} className={activeNav === "news" ? styles.topActive : ""}>กระดานข่าว</button>
          <button onClick={() => goToCommunity("games")} className={activeNav.startsWith("community-") ? styles.topActive : ""}>หอชุมชน</button>
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.bagButton} href="/adventure/marketplace" aria-label="เปิดกระเป๋าและตลาด"><GiKnapsack aria-hidden="true" /><span>เปิดกระเป๋า</span></Link>
          <button className={styles.mobileSettings} onClick={() => openPanel("settings")} aria-label="ตั้งค่าการเดินทาง"><GiSettingsKnobs aria-hidden="true" /></button>
          <Link href={skillsLink} className={styles.avatarButton} aria-label="เปิด Lv และทักษะในชีวิตจริง"><Image src="/adventure/adventurer.webp" width={40} height={40} alt="" /><span aria-hidden="true">⌄</span></Link>
        </div>
      </header>

      <aside className={styles.sidebar}>
        <Link href={skillsLink} className={styles.player} aria-label={`เปิดทักษะชีวิตจริง ${levelLabel} ${skillLabel}`}>
          <div className={styles.portraitFrame}><Image src="/adventure/adventurer.webp" width={86} height={86} alt="ตัวละครนักผจญภัย" /></div>
          <div className={styles.playerInfo}><span>ทักษะชีวิตจริง</span><strong>{levelLabel}</strong>{realSkills ? <progress className={styles.miniProgress} max={100} value={realSkills.percent} aria-label={`ความสามารถรวม ${realSkills.percent} เปอร์เซ็นต์`} /> : null}<small>{realSkills ? `${realSkills.totalEarned.toLocaleString("th-TH")} / ${realSkills.totalPossible.toLocaleString("th-TH")} Lv ทักษะ` : "ระดับสูงสุด 999"}</small><span className={styles.playerRank}>{skillLabel}</span></div>
        </Link>
        <nav className={styles.sideNav} aria-label="บันทึกนักผจญภัย">
          <button className={activeNav === "home" ? styles.sideActive : ""} onClick={goHome}><GiCastle /><span>ศูนย์บัญชาการ</span><span className={styles.activeStar}>✦</span></button>
          <button onClick={() => openPanel("status")}><GiPlayerBase /><span>การเติบโตชุมชน</span></button>
          <Link href="/adventure/marketplace"><GiKnapsack /><span>กระเป๋าและตลาด</span></Link>
          <button className={activeNav === "news" ? styles.sideActive : ""} onClick={goToNews}><GiOpenBook /><span>กระดานข่าว</span><span className={styles.activeStar}>✦</span></button>
          <button onClick={() => openPanel("guilds")}><GiCastle /><span>ทำเนียบกิลด์</span></button>
          <button onClick={() => openPanel("quests")}><GiScrollUnfurled /><span>ภารกิจ</span>{acceptedQuests.length > 0 ? <span className={styles.questCount}>{acceptedQuests.length}</span> : null}</button>
          <span className={styles.navDivider}>พื้นที่ชุมชน</span>
          <button className={activeNav === "community-games" ? styles.sideActive : ""} onClick={() => goToCommunity("games")}><GiCrossedSwords /><span>กระทู้เกม</span></button>
          <button className={activeNav === "community-rewards" ? styles.sideActive : ""} onClick={() => goToCommunity("rewards")}><GiSparkles /><span>ตั๋วนำโชค</span></button>
          <button className={activeNav === "community-guild" ? styles.sideActive : ""} onClick={() => goToCommunity("guild")}><GiCastle /><span>ห้องกิลด์ของฉัน</span></button>
          <button className={activeNav === "community-knowledge" ? styles.sideActive : ""} onClick={() => goToCommunity("knowledge")}><GiOpenBook /><span>หอความรู้</span></button>
          <button className={activeNav === "community-achievements" ? styles.sideActive : ""} onClick={() => goToCommunity("achievements")}><GiLaurels /><span>สมุดความสำเร็จ</span></button>
          <Link href="/adventure/skills"><GiLaurels aria-hidden="true" /><span>Lv และทักษะชีวิตจริง</span></Link>
          <Link href="/adventure/headquarters"><GiCastle aria-hidden="true" /><span>โครงการศูนย์กลาง</span></Link>
          <Link href="/adventure/raffles"><GiTicket aria-hidden="true" /><span>ส่งตั๋วชิงโชค</span></Link>
          <Link href="/adventure/register"><GiCompass aria-hidden="true" /><span>ทะเบียนนักผจญภัย</span></Link>
          <Link href="/adventure/login"><GiCompass aria-hidden="true" /><span>บัญชีสมาชิก</span></Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <GiCompass className={styles.fadedCompass} aria-hidden="true" />
          <p>“ทุกเส้นทาง<br />ล้วนมีเรื่องราวรอให้ค้นพบ”</p>
          <div className={styles.ornament} aria-hidden="true"><span>✧</span></div>
          <button className={styles.settings} onClick={() => openPanel("settings")}><GiSettingsKnobs /> ตั้งค่า</button>
        </div>
      </aside>

      <main id="adventure-main" className={styles.main}>
        <div className={styles.welcome} data-reveal>
          <h1>{isVisitor ? "ยินดีต้อนรับ, ผู้มาเยือน" : realSkills ? "ยินดีต้อนรับกลับ, นักผจญภัย" : "ยินดีต้อนรับสู่ Me Guild"}</h1>
          <div className={styles.welcomeLine} aria-hidden="true"><span>✧</span></div>
          <span className={styles.date}>วันอังคารที่ 27 ตุลาคม พ.ศ. 2569</span>
        </div>

        {isVisitor ? <section className={styles.registrationNotice} aria-label="ทะเบียนนักผจญภัย"><div><h2>พร้อมเริ่มการผจญภัยแล้วหรือยัง?</h2><p>บัญชีของคุณยังเป็นผู้มาเยือน ลงทะเบียนนักผจญภัยเพื่อเริ่มเลเวล 1 แล้วฝึกทักษะชีวิตจริงตามเส้นทางของคุณ</p></div><Link href="/adventure/register?returnTo=%2Fadventure%3Fprogression%3Dmember">ลงทะเบียนนักผจญภัย <Arrow small /></Link></section> : null}

        <section className={styles.hero} aria-labelledby="adventure-hero-title" data-reveal>
          <Image src="/adventure/kingdom.webp" alt="อาณาจักรแฟนตาซีกลางหุบเขาและต้นไม้ยักษ์ รอคอยเหล่านักผจญภัย" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 85vw, 80vw" preload className={styles.heroImage} />
          <div className={styles.heroFade} />
          <div className={styles.heroContent}>
            <h2 id="adventure-hero-title">ทุกตำนาน<br />เริ่มต้นที่นี่</h2>
            <p>โลกใบใหม่ เพื่อนร่วมทาง<br className={styles.mobileBreak} /> และเรื่องราวที่รอให้คุณเขียน</p>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton} onClick={() => openPanel("guilds")}>ออกสำรวจกิลด์ <Arrow /></button>
              <Link href={skillsLink} className={styles.textButton}>ดู Lv และทักษะของฉัน <Arrow small /></Link>
            </div>
          </div>
          <div className={styles.heroSeal} aria-hidden="true"><GiCompass /></div>
        </section>

        <section className={styles.stats} aria-label="Lv ทักษะชีวิตจริงและการมีส่วนร่วมในชุมชน" data-reveal>
          <Link href={skillsLink}><GiCompass className={styles.statIcon} /><span><small>Lv ทักษะชีวิตจริง</small><strong>{levelLabel}</strong><span className={styles.statHint}>{skillLabel}</span></span></Link>
          <button onClick={() => openPanel("status")} className={styles.experience}><GiOpenBook className={styles.statIcon} /><span><small>{progression.mode === "demo" ? "EXP ชุมชน · ตัวอย่าง" : "EXP ชุมชน"}</small><strong className={styles.xpValue}>{xpLabel}</strong><progress className={styles.xpTrack} max={100} value={playerProgress?.progressPercent ?? 0} aria-hidden={!playerProgress} aria-label={`EXP ชุมชนสู่เลเวลถัดไป ${xpLabel}`} /><span className={styles.statHint}>{playerProgress ? playerProgress.isMaxLevel ? "ถึงเลเวลชุมชนสูงสุดแล้ว" : `อีก ${playerProgress.xpRemaining.toLocaleString("en-US")} EXP` : "เปิดการเติบโตชุมชนเพื่อดู"}</span></span></button>
          <button onClick={() => openPanel("status")}><GiLaurels className={styles.statIcon} /><span><small>กิจกรรมที่ยืนยันแล้ว</small><strong>{playerProgress?.metrics.participatedEvents ?? "—"}</strong><span className={styles.statHint}>{progression.mode === "demo" ? "ข้อมูลตัวอย่าง" : "จากประวัติที่ได้รับ"}</span></span></button>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.newsPanel} id="adventure-news" aria-labelledby="adventure-news-title" data-reveal>
            <div className={styles.sectionHeading}><h2 id="adventure-news-title"><GiSparkles />กระดานข่าวสาร</h2><span className={styles.sectionStar} aria-hidden="true">✧</span></div>
            <div className={styles.newsTabs} aria-label="หมวดข่าวสาร">{categories.map((item) => <button key={item} aria-pressed={category === item} className={category === item ? styles.selectedTab : ""} onClick={() => { setCategory(item); setShowAllNews(false); }}>{item}</button>)}</div>
            <div className={styles.newsList} aria-live="polite">{visibleNews.map((post) => <button key={post.id} className={styles.newsRow} onClick={() => readPost(post)}>
              <span className={`${styles.newsIcon} ${post.category === "กิจกรรม" ? styles.goldIcon : post.category === "ประกาศ" ? styles.greenIcon : styles.blueIcon}`}><NewsSymbol category={post.category} /></span>
              <span className={styles.newsCopy}><strong>{post.title}</strong><span>{post.excerpt}</span><small className={styles.mobileNewsDate}>{post.date}</small></span>
              <time>{post.date}</time><span className={styles.chevron} aria-hidden="true">›</span>
            </button>)}</div>
            {category === "ทั้งหมด" ? <button className={styles.allNews} onClick={() => setShowAllNews((value) => !value)}>{showAllNews ? "ย่อกระดานข่าว" : "อ่านข่าวสารทั้งหมด"}<Arrow small /></button> : null}
          </section>

          <section className={styles.guildPanel} aria-labelledby="adventure-guild-title" data-reveal>
            <div className={styles.sectionHeading}><h2 id="adventure-guild-title"><GiCastle />โถงกิลด์</h2><button className={styles.textButton} onClick={() => openPanel("guilds")}>ดูทั้งหมด <Arrow small /></button></div>
            <Tilt tiltEnable={canAnimate} tiltMaxAngleX={2} tiltMaxAngleY={3} scale={1.01} transitionSpeed={900} className={styles.tavernTilt}>
              <button className={styles.tavernButton} onClick={() => openPanel("guilds")} aria-label="สำรวจโถงกิลด์"><Image src="/adventure/guild-hall.webp" alt="โถงกิลด์ไม้แสนอบอุ่น ประดับธงเขียวและโคมไฟสีทอง" width={720} height={340} sizes="(max-width: 700px) 90vw, 35vw" /></button>
            </Tilt>
            <div className={styles.guildSummary}>
              <span className={styles.guildCrest} aria-hidden="true"><GiCompass /></span>
              <div className={styles.guildName}><h3>{featuredGuild.name}</h3><p>{featuredGuild.members + (joinedGuild === featuredGuild.id ? 1 : 0)} นักผจญภัย</p></div>
              <button className={styles.primaryButton} onClick={() => openPanel("guilds")}>{joinedGuild ? "กิลด์ของฉัน" : "เข้าสู่โถงกิลด์"}<Arrow small /></button>
            </div>
          </section>
        </div>

        <section className={styles.questPanel} aria-labelledby="adventure-quest-title" data-reveal>
          <div className={styles.sectionHeading}><h2 id="adventure-quest-title"><GiScrollUnfurled />ภารกิจแนะนำ</h2><button className={styles.textButton} onClick={() => openPanel("quests")}>ดูภารกิจทั้งหมด <Arrow small /></button></div>
          <div className={styles.questRow}><span className={styles.questEmblem} aria-hidden="true"><GiCrossedSwords /></span><div><h3>{quests[1].title}</h3><p>{quests[1].description}</p></div><span className={styles.questReward}>{quests[1].reward}</span><button className={styles.goldButton} onClick={() => acceptQuest(quests[1].id)} disabled={acceptedQuests.includes(quests[1].id)}>{acceptedQuests.includes(quests[1].id) ? "รับภารกิจแล้ว ✓" : "รับภารกิจ"}<Arrow small /></button></div>
          <span className={styles.srOnly} role="status">{acceptedQuests.length ? `รับภารกิจแล้ว ${acceptedQuests.length} ภารกิจ` : ""}</span>
        </section>
        <section className={styles.projectTeaser} aria-labelledby="headquarters-teaser-title" data-reveal>
          <Link href="/adventure/headquarters" className={styles.projectTile} aria-label="สำรวจโครงการสร้างศูนย์กลาง Me Guild"><Image src="/adventure/headquarters-tile.webp" alt="ภาพแนวคิดอาคารศูนย์กลาง Me Guild" width={640} height={568} /></Link>
          <div><h2 id="headquarters-teaser-title">ร่วมวาดศูนย์กลาง Me Guild</h2><p>แนวคิดพื้นที่พบปะของคนรักเกม หนังสือ และการสร้างสรรค์ในกรุงเทพฯ อ่านแผนและร่วมบอกต่อได้ตามความสะดวก</p><small>ภาพแนวคิดอาคาร · ดูแผนและสถานะล่าสุดในหน้าโครงการ</small></div>
          <Link href="/adventure/headquarters" className={styles.projectCta}>สำรวจโครงการ <Arrow small /></Link>
        </section>
        <CommunityCommons view={communityView} onViewChange={(view) => { setCommunityView(view); setActiveNav(`community-${view}`); }} joinedGuild={joinedGuild} onExploreGuilds={() => openPanel("guilds")} initialAuthError={memberAuthError ?? undefined} onProgressionRefresh={progression.loadMember} onMemberSignedOut={progression.clearMember} />
        <footer className={styles.footer}><span><GiCompass aria-hidden="true" /> Me Guild · Your next chapter begins here.</span><span>โลกตัวอย่าง · สเตตัสสมาชิกแยกตามบัญชี</span></footer>
      </main>

      {panel ? <AdventureDialogs progression={progression} panel={panel} onClose={() => setPanel(null)} selectedNews={selectedNews} joinedGuild={joinedGuild} onJoinGuild={setJoinedGuild} acceptedQuests={acceptedQuests} onAcceptQuest={acceptQuest} motionEnabled={motionEnabled} onToggleMotion={() => setMotionEnabled((enabled) => !enabled)} /> : null}
    </div>
  );
}
