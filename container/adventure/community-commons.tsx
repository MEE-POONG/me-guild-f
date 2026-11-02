"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  GiCalendar, GiCheckMark, GiCompass, GiCrown, GiCrossedSwords,
  GiFeather, GiLaurels, GiMagnifyingGlass, GiOpenBook,
  GiOpenTreasureChest, GiPadlock, GiPencil, GiPresent,
  GiSparkles, GiTalk, GiThreeFriends, GiTicket,
} from "react-icons/gi";
import {
  communities, communityThreads, knowledgeTracks, rewardCampaigns,
  type CommunityThread, type RewardCampaign, type RewardPrize, type ThreadCategory,
} from "./community-data";
import styles from "./community-commons.module.css";
import { AchievementBook } from "./achievement-book";

export type CommunityView = "games" | "rewards" | "guild" | "knowledge" | "achievements";
type CommunityCommonsProps = {
  view: CommunityView;
  onViewChange: (view: CommunityView) => void;
  joinedGuild: string | null;
  onExploreGuilds: () => void;
  initialAuthError?: string;
  onProgressionRefresh?: () => Promise<void>;
  onMemberSignedOut?: () => void;
};
type GuildRoom = {
  id: string;
  name: string;
  description: string | null;
  serverId: string;
  yourPosition: string;
  memberCount: number;
  rooms: { kind: string; label: string; url: string }[];
};
type RoomState =
  | { status: "idle" | "loading" | "anonymous" | "no-guild" | "error"; message?: string }
  | { status: "ready"; guild: GuildRoom };
type Modal = { kind: "compose" } | { kind: "thread"; id: string } | null;
type LiveRewardState =
  | { status: "idle" | "loading" | "anonymous" | "no-guild" | "not-configured" | "error" }
  | { status: "ready"; campaigns: RewardCampaign[] };
const gameCategories: ThreadCategory[] = ["พูดคุย", "อีเวนต์", "โค้ดแลกของ", "ช่วยเพื่อน", "แบ่งปันความรู้"];
const knowledgeCategories: ThreadCategory[] = ["แบ่งปันความรู้", "ถามตอบ"];
const viewLabels: { id: CommunityView; label: string; icon: typeof GiTalk }[] = [
  { id: "games", label: "กระทู้เกม", icon: GiTalk },
  { id: "rewards", label: "ตั๋วนำโชค", icon: GiTicket },
  { id: "guild", label: "ห้องกิลด์ของฉัน", icon: GiThreeFriends },
  { id: "knowledge", label: "หอความรู้", icon: GiOpenBook },
  { id: "achievements", label: "สมุดความสำเร็จ", icon: GiLaurels },
];
const statusLabels = { OPEN: "เปิดรับอยู่", UPCOMING: "เร็ว ๆ นี้", CLOSED: "สิ้นสุดแล้ว" } as const;

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}

function CategoryIcon({ category }: { category: ThreadCategory }) {
  const Icon = category === "อีเวนต์" ? GiCalendar : category === "โค้ดแลกของ" ? GiPresent : category === "ช่วยเพื่อน" ? GiCrossedSwords : category === "แบ่งปันความรู้" ? GiOpenBook : GiTalk;
  return <Icon aria-hidden="true" />;
}

function PrizeIcon({ kind }: { kind: RewardPrize["kind"] }) {
  const Icon = kind === "ROLE" ? GiCrown : kind === "BADGE" ? GiLaurels : GiOpenTreasureChest;
  return <Icon aria-hidden="true" />;
}

function ComposeThreadForm({ knowledge, onCreate }: { knowledge: boolean; onCreate: (thread: CommunityThread) => void }) {
  const [category, setCategory] = useState<ThreadCategory>(knowledge ? "แบ่งปันความรู้" : "พูดคุย");
  const [formError, setFormError] = useState("");
  const choices = knowledge ? knowledgeCategories : gameCategories;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const title = String(values.get("title") ?? "").trim();
    const body = String(values.get("body") ?? "").trim();
    if (!title || !body) { setFormError("กรุณาใส่ชื่อและเนื้อหากระทู้ที่มีข้อความ"); return; }
    const eventTitle = String(values.get("eventTitle") ?? "").trim();
    const code = String(values.get("code") ?? "").trim();
    const thread: CommunityThread = {
      id: `local-${crypto.randomUUID()}`,
      spaceId: knowledge ? "knowledge" : String(values.get("spaceId")),
      category,
      title,
      body,
      author: "นักผจญภัยตัวอย่าง",
      replies: [],
      createdAt: new Date().toISOString(),
      resolved: false,
      ...(eventTitle ? { eventTitle } : {}),
      ...(category === "โค้ดแลกของ" && code ? {
        redeemCode: {
          code: code.startsWith("DEMO-") ? code : `DEMO-${code}`,
          reward: String(values.get("reward") ?? "ของรางวัลตัวอย่าง").trim(),
          expiresAt: "2026-12-31T23:59:00+07:00",
          sourceLabel: "โค้ดทดลองที่สร้างในหน้านี้ · แลกจริงไม่ได้",
        },
      } : {}),
    };
    onCreate(thread);
  };

  return <form className={styles.composeForm} onSubmit={submit}>
    <p className={styles.formIntro}>ฝากเรื่องเล่า คำถาม หรือชวนสหายมาช่วยกันค้นหาคำตอบ</p>
    {!knowledge ? <label>ชุมชนเกม<select name="spaceId" defaultValue="genshin" required>{communities.filter((space) => space.kind === "GAME").map((space) => <option key={space.id} value={space.id}>{space.gameName}</option>)}</select></label> : null}
    <label>หมวดกระทู้<select name="category" value={category} onChange={(event) => setCategory(event.target.value as ThreadCategory)}>{choices.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>ชื่อกระทู้ <span>จำเป็น</span><input name="title" required maxLength={120} placeholder="เรื่องราวบทนี้ของคุณชื่ออะไร" /></label>
    <label>เนื้อหา <span>จำเป็น</span><textarea name="body" required minLength={5} maxLength={5000} rows={5} placeholder="เล่าให้เพื่อนร่วมทางฟัง…" /></label>
    {category === "อีเวนต์" || category === "โค้ดแลกของ" ? <label>กิจกรรมที่เกี่ยวข้อง <span>ไม่จำเป็น</span><input name="eventTitle" maxLength={100} placeholder="เช่น เทศกาลแห่งดวงดาว · กิจกรรมตัวอย่าง" /></label> : null}
    {category === "โค้ดแลกของ" ? <fieldset className={styles.codeFields}><legend>โค้ดตัวอย่าง</legend><label>ข้อความโค้ด<input name="code" required maxLength={60} autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="DEMO-TRAVELER" /></label><label>ของรางวัลตัวอย่าง<input name="reward" required maxLength={120} placeholder="กล่องเสบียงตัวอย่าง" /></label><small>ระบบเติม DEMO- ให้โค้ดทดลองเสมอ และยังไม่มีการแลกของจริง</small></fieldset> : null}
    <p className={styles.demoNote}>กระทู้จะอยู่เฉพาะหน้าตัวอย่างนี้ รีเฟรชแล้วเริ่มใหม่</p>
    {formError ? <p className={styles.error} role="alert">{formError}</p> : null}
    <button className={styles.primary} type="submit"><GiFeather aria-hidden="true" />{knowledge ? "แบ่งปันในหอความรู้" : "ตั้งกระทู้ตัวอย่าง"}</button>
  </form>;
}

export function CommunityCommons({ view, onViewChange, joinedGuild, onExploreGuilds, initialAuthError, onProgressionRefresh, onMemberSignedOut }: CommunityCommonsProps) {
  const [threads, setThreads] = useState(communityThreads);
  const [spaceId, setSpaceId] = useState("all");
  const [category, setCategory] = useState<ThreadCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("latest");
  const [modal, setModal] = useState<Modal>(null);
  const [rewardStatus, setRewardStatus] = useState<"ALL" | "OPEN" | "UPCOMING" | "CLOSED">("ALL");
  const [liveRewards, setLiveRewards] = useState<LiveRewardState>({ status: "idle" });
  const rewardController = useRef<AbortController | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState(initialAuthError ?? "");
  const [notice, setNotice] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousModalKind = useRef<"compose" | "thread" | null>(null);
  const activeThread = modal?.kind === "thread" ? threads.find((thread) => thread.id === modal.id) : undefined;
  const knowledge = view === "knowledge";
  const validCategories = knowledge ? knowledgeCategories : gameCategories;
  const activeCategory = category !== "all" && validCategories.includes(category) ? category : "all";
  const normalizedQuery = query.trim().toLocaleLowerCase("th");
  const visibleThreads = threads.filter((thread) => {
    const space = communities.find((entry) => entry.id === thread.spaceId);
    if (knowledge ? thread.spaceId !== "knowledge" : space?.kind !== "GAME") return false;
    if (!knowledge && spaceId !== "all" && thread.spaceId !== spaceId) return false;
    if (activeCategory !== "all" && thread.category !== activeCategory) return false;
    return !normalizedQuery || `${thread.title} ${thread.body} ${thread.author} ${space?.gameName ?? space?.name ?? ""}`.toLocaleLowerCase("th").includes(normalizedQuery);
  }).sort((a, b) => sort === "replies" ? b.replies.length - a.replies.length : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (modal && dialog) {
      if (!dialog.open) dialog.showModal();
      else if (previousModalKind.current && previousModalKind.current !== modal.kind) {
        dialogHeadingRef.current?.focus({ preventScroll: true });
      }
    }
    if (!modal && dialog?.open) dialog.close();
    previousModalKind.current = modal?.kind ?? null;
  }, [modal]);



  useEffect(() => () => rewardController.current?.abort(), []);

  const changeView = (next: CommunityView) => { setCategory("all"); setQuery(""); setNotice(""); onViewChange(next); };
  const createThread = (thread: CommunityThread) => {
    setThreads((previous) => [thread, ...previous]);
    setSpaceId(thread.spaceId);
    setCategory("all");
    setQuery("");
    setModal({ kind: "thread", id: thread.id });
    setNotice("ตั้งกระทู้ตัวอย่างแล้ว");
  };
  const addReply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeThread) return;
    const form = event.currentTarget;
    const body = String(new FormData(form).get("reply") ?? "").trim();
    if (!body) return;
    setThreads((previous) => previous.map((thread) => thread.id === activeThread.id ? { ...thread, replies: [...thread.replies, { id: `reply-${crypto.randomUUID()}`, author: "นักผจญภัยตัวอย่าง", body }] } : thread));
    form.reset();
    setNotice("ฝากคำตอบตัวอย่างแล้ว");
  };
  const startSignIn = async () => {
    setSigningIn(true);
    setLoginError("");
    try {
      const csrfResponse = await fetch("/api/adventure/member-auth/csrf", { cache: "no-store", credentials: "same-origin" });
      const csrf = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("csrf");
      const response = await fetch("/api/adventure/member-auth/signin/discord", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: `${window.location.origin}/adventure?community=${view === "rewards" ? "rewards" : "guild"}#community`, json: "true" }),
      });
      const result = await response.json() as { url?: string };
      if (!response.ok || !result.url) throw new Error("signin");
      const redirect = new URL(result.url, window.location.origin);
      if (redirect.origin !== window.location.origin && redirect.hostname !== "discord.com") throw new Error("redirect");
      window.location.assign(redirect.toString());
    } catch {
      setLoginError("ยังเริ่มเข้าสู่ระบบสมาชิกไม่ได้ กรุณาลองใหม่เมื่อบริการพร้อม");
      setSigningIn(false);
    }
  };
  const loadLiveRewards = async () => {
    rewardController.current?.abort();
    const controller = new AbortController();
    rewardController.current = controller;
    setRewardStatus("ALL");
    setLiveRewards({ status: "loading" });
    try {
      const response = await fetch("/api/adventure/rewards", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
      if (controller.signal.aborted) return;
      if (response.status === 401) { setLiveRewards({ status: "anonymous" }); return; }
      if (response.status === 404) { setLiveRewards({ status: "no-guild" }); return; }
      if (response.status === 409) { setLiveRewards({ status: "not-configured" }); return; }
      if (!response.ok) throw new Error("service");
      const payload = await response.json() as { source?: string; campaigns?: RewardCampaign[] };
      if (payload.source !== "live" || !Array.isArray(payload.campaigns)) throw new Error("shape");
      if (!controller.signal.aborted) setLiveRewards({ status: "ready", campaigns: payload.campaigns });
    } catch {
      if (!controller.signal.aborted) setLiveRewards({ status: "error" });
    }
  };
  const showingLiveRewards = liveRewards.status !== "idle";
  const catalog = liveRewards.status === "ready" ? liveRewards.campaigns : liveRewards.status === "idle" ? rewardCampaigns : [];
  const visibleCampaigns = catalog.filter((campaign) => rewardStatus === "ALL" || campaign.status === rewardStatus);

  return <section id="community" className={styles.commons} aria-labelledby="community-title">
    <header className={styles.heading}><GiCompass aria-hidden="true" /><div><h2 id="community-title">หอชุมชน</h2><p>ทุกความสนใจ มีพื้นที่ให้ร่วมเดินทาง</p></div><span aria-hidden="true" /></header>
    <nav className={styles.viewTabs} aria-label="พื้นที่ชุมชน">{viewLabels.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => changeView(id)} aria-pressed={view === id}><Icon aria-hidden="true" /><span>{label}</span></button>)}</nav>

    {view === "games" || knowledge ? <div className={styles.forumLayout}>
      <aside className={styles.filters} aria-label={knowledge ? "หมวดหอความรู้" : "เลือกชุมชนและหมวดกระทู้"}>
        <h3>{knowledge ? "หอความรู้" : "เลือกเกม"}</h3>
        {knowledge ? <div className={styles.knowledgeWelcome}><GiOpenBook aria-hidden="true" /><p>เรียนรู้ แบ่งปัน<br />และเติบโตไปด้วยกัน</p></div> : <div className={styles.spaceButtons}><button type="button" aria-pressed={spaceId === "all"} onClick={() => setSpaceId("all")}><GiSparkles aria-hidden="true" /><span>All games</span><span aria-hidden="true">›</span></button>{communities.filter((space) => space.kind === "GAME").map((space, index) => <button type="button" key={space.id} aria-pressed={spaceId === space.id} onClick={() => setSpaceId(space.id)}><span className={`${styles.gameMark} ${index === 1 ? styles.redMark : index === 2 ? styles.greenMark : ""}`} aria-hidden="true">{space.gameName?.slice(0, 1)}</span><span>{space.gameName}</span><span aria-hidden="true">›</span></button>)}</div>}
        <div className={styles.filterDivider} />
        <h3>หมวดหมู่</h3>
        <div className={styles.categoryButtons}><button type="button" aria-pressed={activeCategory === "all"} onClick={() => setCategory("all")}><GiCompass aria-hidden="true" />ทั้งหมด</button>{validCategories.map((item) => <button type="button" key={item} aria-pressed={activeCategory === item} onClick={() => setCategory(item)}><CategoryIcon category={item} />{item}</button>)}</div>
        <GiCompass className={styles.filterCompass} aria-hidden="true" />
      </aside>

      <div className={styles.discussions}>
        <div className={styles.toolbar}><label className={styles.searchLabel}><span>ค้นหากระทู้</span><div><GiMagnifyingGlass aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={knowledge ? "ค้นหาความรู้หรือคำถาม" : "ค้นหากระทู้"} autoCapitalize="off" autoCorrect="off" spellCheck={false} /></div></label><button type="button" className={styles.primary} onClick={() => setModal({ kind: "compose" })}><GiPencil aria-hidden="true" />{knowledge ? "แบ่งปันความรู้" : "ตั้งกระทู้"}</button></div>
        <div className={styles.listMeta}><span aria-live="polite">พบ {visibleThreads.length} กระทู้</span><label>เรียงตาม<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="latest">ล่าสุดก่อน</option><option value="replies">คำตอบมากที่สุด</option></select></label></div>
        <div className={styles.threadList}>{visibleThreads.map((thread) => {
          const space = communities.find((entry) => entry.id === thread.spaceId);
          return <button type="button" key={thread.id} className={styles.threadRow} onClick={() => { setModal({ kind: "thread", id: thread.id }); setNotice(""); }}>
            <span className={styles.threadSymbol}><CategoryIcon category={thread.category} /></span>
            <span className={styles.threadCopy}><span className={styles.threadMeta}><span className={styles.categoryTag}>{thread.category}</span><span>{space?.gameName ?? space?.name}</span>{thread.resolved ? <span className={styles.resolved}><GiCheckMark aria-hidden="true" />ตอบแล้ว</span> : null}</span><strong>{thread.title}</strong><span className={styles.excerpt}>{thread.body.split("\n\n")[0]}</span>{thread.eventTitle ? <span className={styles.eventLink}><GiCalendar aria-hidden="true" />กิจกรรม: {thread.eventTitle}</span> : null}</span>
            <span className={styles.threadAside}><span>{thread.author}</span><time dateTime={thread.createdAt}>{dateLabel(thread.createdAt)}</time><span className={styles.replyCount}><GiTalk aria-hidden="true" />{thread.replies.length}</span></span>
          </button>;
        })}{!visibleThreads.length ? <div className={styles.empty}><GiMagnifyingGlass aria-hidden="true" /><h3>ยังไม่พบเรื่องราวนี้</h3><p>ลองคำค้นอื่น หรือเริ่มตั้งกระทู้ชวนเพื่อนคุย</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); setSpaceId("all"); }}>ล้างตัวกรอง</button></div> : null}</div>
      </div>

      <aside className={styles.rightRail} aria-label="พื้นที่แนะนำ">
        <div className={styles.rewardTeaser}><button type="button" className={styles.railHeading} onClick={() => changeView("rewards")}><GiPresent aria-hidden="true" /><span><strong>รายการรางวัลตั๋วนำโชค</strong><small>ดูตัวอย่างรางวัล</small></span><span aria-hidden="true">›</span></button><div className={styles.teaserPrizes}>{rewardCampaigns[0].prizes.map((prize) => <button type="button" key={prize.label} onClick={() => changeView("rewards")}><PrizeIcon kind={prize.kind} /><span><strong>{prize.label.replace(" · ตัวอย่าง", "")}</strong><small>{prize.kind === "ROLE" ? "ยศประดับตัวละคร" : prize.kind === "BADGE" ? "ตราประดับโปรไฟล์" : "สัมภาระนักเดินทาง"} · ตัวอย่าง</small></span><span aria-hidden="true">›</span></button>)}</div></div>
        <div className={styles.learningTeaser}><button type="button" className={styles.railHeading} onClick={() => changeView("knowledge")}><GiOpenBook aria-hidden="true" /><span><strong>หอความรู้</strong><small>เรียนรู้ไปด้วยกัน เพื่อการเดินทางที่ไกลกว่า</small></span></button>{knowledgeTracks.slice(0, 2).map((track) => <button type="button" className={styles.trackLink} key={track.id} onClick={() => setModal({ kind: "thread", id: track.threadId })}><GiFeather aria-hidden="true" /><span><strong>{track.title}</strong><small>{track.description}</small></span><span aria-hidden="true">›</span></button>)}</div>
        <button type="button" className={styles.guildTeaser} onClick={() => changeView("guild")}><GiPadlock aria-hidden="true" /><span><strong>ห้องกิลด์ของฉัน</strong><small>ยืนยันตัวตน เพื่อเปิดข้อมูลเฉพาะกลุ่ม</small></span><span aria-hidden="true">›</span></button>
      </aside>
    </div> : null}

    {view === "rewards" ? <div className={styles.rewardsView}>
      <div className={styles.catalogMessage}><GiTicket aria-hidden="true" /><h3>ใช้ตั๋ว Discord ส่งชิงโชค</h3><p>เลือกเซิร์ฟเวอร์และกิจกรรม ตรวจยอดตั๋ว จำนวนผู้โชคดี และยืนยันก่อนใช้ตั๋วทุกครั้ง</p><Link className={styles.primary} href="/adventure/raffles">เปิดกระดานส่งตั๋วชิงโชค →</Link></div>
      <div className={styles.viewIntro}><GiPresent aria-hidden="true" /><div><h3>รายการรางวัลจากตั๋วนำโชค</h3><p>สำรวจของรางวัลของแต่ละรอบ ก่อนออกเดินทางบทต่อไป</p></div></div>
      <div className={styles.catalogSource}><div><strong>{showingLiveRewards ? "รางวัลในชุมชนของฉัน" : "กำลังดูรายการตัวอย่าง"}</strong><span>{showingLiveRewards ? "ตรวจสอบสมาชิกและขอบเขตชุมชนจากเซิร์ฟเวอร์" : "ชื่อรอบและรางวัลในตัวอย่างไม่ใช่ข้อมูลจริง"}</span></div><button type="button" className={showingLiveRewards ? styles.secondary : styles.primary} onClick={showingLiveRewards ? () => { rewardController.current?.abort(); setLiveRewards({ status: "idle" }); setRewardStatus("ALL"); } : loadLiveRewards}>{showingLiveRewards ? "กลับไปดูตัวอย่าง" : "ดูรางวัลในชุมชนของฉัน"}</button></div>
      {liveRewards.status === "idle" || liveRewards.status === "ready" ? <div className={styles.rewardFilters} aria-label="สถานะรอบรางวัล">{(showingLiveRewards ? ["ALL", "OPEN"] as const : ["ALL", "OPEN", "UPCOMING", "CLOSED"] as const).map((status) => <button type="button" key={status} aria-pressed={rewardStatus === status} onClick={() => setRewardStatus(status)}>{status === "ALL" ? "ทุกรอบ" : statusLabels[status]}</button>)}</div> : null}
      {liveRewards.status === "loading" ? <div className={styles.catalogMessage} role="status"><GiCompass aria-hidden="true" /><h4>กำลังเปิดสมุดรางวัลของชุมชน…</h4><p>ตรวจเฉพาะรอบตั๋วนำโชคที่เปิดให้คุณดูได้</p></div> : null}
      {liveRewards.status === "anonymous" ? <div className={styles.catalogMessage}><GiPadlock aria-hidden="true" /><h4>เข้าสู่ระบบสมาชิก เพื่อดูรางวัลในชุมชนของคุณ</h4><p>รายการจริงจะปรากฏหลังตรวจสอบสมาชิกแล้ว</p><button type="button" className={styles.primary} onClick={startSignIn} disabled={signingIn}>{signingIn ? "กำลังเปิดประตู…" : "เข้าสู่ระบบสมาชิกด้วย Discord"}</button>{loginError ? <p className={styles.error} role="alert">{loginError}</p> : null}</div> : null}
      {liveRewards.status === "no-guild" ? <div className={styles.catalogMessage}><GiThreeFriends aria-hidden="true" /><h4>ยังไม่พบชุมชนของกิลด์สำหรับสมาชิกนี้</h4><p>เข้าร่วมกิลด์ในระบบจริงก่อนดูรายการของชุมชน</p><button type="button" className={styles.secondary} onClick={onExploreGuilds}>สำรวจทำเนียบกิลด์ตัวอย่าง</button></div> : null}
      {liveRewards.status === "not-configured" ? <div className={styles.catalogMessage}><GiTicket aria-hidden="true" /><h4>ยังไม่มีรอบตั๋วนำโชคที่เปิดให้ชุมชนนี้</h4><p>กลับมาตรวจเมื่อผู้ดูแลประกาศรอบถัดไป</p></div> : null}
      {liveRewards.status === "error" ? <div className={styles.catalogMessage}><GiPresent aria-hidden="true" /><h4>สมุดรางวัลยังเปิดไม่ได้</h4><p>บริการยังไม่พร้อมในขณะนี้ ลองใหม่ได้ในอีกสักครู่</p><button type="button" className={styles.primary} onClick={loadLiveRewards}>ลองโหลดรางวัลอีกครั้ง</button></div> : null}
      <div className={styles.rewardCampaigns}>{visibleCampaigns.map((campaign) => <article key={campaign.id} className={styles.campaign}><header><span className={`${styles.campaignStatus} ${campaign.status === "OPEN" ? styles.openStatus : ""}`}>{statusLabels[campaign.status]}</span><h4>{campaign.title}</h4><p>{campaign.serverName}</p><small>ปิดรอบ {dateLabel(campaign.closesAt)}</small></header><ul>{campaign.prizes.map((prize) => <li key={prize.label}><span><PrizeIcon kind={prize.kind} /></span><div><strong>{prize.label.replace(" · ตัวอย่าง", "")}</strong><small>{prize.kind === "ROLE" ? "ยศ" : prize.kind === "BADGE" ? "ตราสัญลักษณ์" : "ไอเทม"}</small></div><b>×{prize.quantity}</b></li>)}</ul></article>)}</div>
      {liveRewards.status === "ready" && !visibleCampaigns.length ? <div className={styles.catalogMessage}><GiTicket aria-hidden="true" /><h4>ยังไม่มีรางวัลในรอบที่เปิดอยู่</h4><p>ไม่มีการนำข้อมูลตัวอย่างมาแทนรายการจริง</p></div> : null}
      <div className={styles.ticketExplanation}><GiTicket aria-hidden="true" /><p><strong>ตั๋วสะสม กับสิทธิ์ของแต่ละกิจกรรม แสดงแยกกัน</strong><span>รายการด้านบนเป็นสมุดรางวัลเดิมของกิลด์ หากต้องการใช้ยอดตั๋วจาก Discord ให้เปิดกระดานส่งตั๋วและยืนยันจำนวนก่อนทำรายการ</span></p></div>
    </div> : null}

    {view === "guild" ? <OwnGuildRoomView joinedGuild={joinedGuild} onExploreGuilds={onExploreGuilds} onSignIn={startSignIn} signingIn={signingIn} loginError={loginError} onSignedOut={() => { rewardController.current?.abort(); setLiveRewards({ status: "idle" }); onMemberSignedOut?.(); }} /> : null}

    {view === "achievements" ? <AchievementBook onProgressionRefresh={onProgressionRefresh} /> : null}
    <p className={styles.commonsFooter}><span aria-hidden="true">✧</span> กระทู้และโค้ดเป็นข้อมูลตัวอย่าง · รางวัล ห้องกิลด์ และความสำเร็จจริงตรวจสิทธิ์จากเซิร์ฟเวอร์ <span aria-hidden="true">✧</span></p>
    <span className={styles.srOnly} role="status">{notice}</span>

    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="community-dialog-title" onClose={() => { if (!dialogRef.current?.open) setModal(null); }}>
      <header className={styles.dialogHeader}><div><GiCompass aria-hidden="true" /><h3 id="community-dialog-title" ref={dialogHeadingRef} tabIndex={-1}>{modal?.kind === "compose" ? knowledge ? "แบ่งปันในหอความรู้" : "ตั้งกระทู้ใหม่" : "บันทึกจากหอชุมชน"}</h3></div><form method="dialog"><button type="submit" aria-label="ปิดกระทู้" autoFocus>×</button></form></header>
      <div className={styles.dialogContent}>{modal?.kind === "compose" ? <ComposeThreadForm knowledge={knowledge} onCreate={createThread} /> : activeThread ? <article className={styles.threadDetail}><div className={styles.threadMeta}><span className={styles.categoryTag}>{activeThread.category}</span><span>{communities.find((space) => space.id === activeThread.spaceId)?.gameName ?? "หอความรู้"}</span>{activeThread.resolved ? <span className={styles.resolved}><GiCheckMark aria-hidden="true" />ตอบแล้ว</span> : null}</div><h4>{activeThread.title}</h4><p className={styles.detailAuthor}>{activeThread.author} · {dateLabel(activeThread.createdAt)}</p>{activeThread.eventTitle ? <p className={styles.detailEvent}><GiCalendar aria-hidden="true" />กิจกรรม: {activeThread.eventTitle}</p> : null}{activeThread.body.split("\n\n").map((paragraph, index) => <p className={styles.bodyParagraph} key={index}>{paragraph}</p>)}{activeThread.redeemCode ? <div className={styles.codeBox}><span>โค้ดตัวอย่าง</span><code>{activeThread.redeemCode.code}</code><p>{activeThread.redeemCode.reward}</p><small>หมดอายุ {dateLabel(activeThread.redeemCode.expiresAt)} · {activeThread.redeemCode.sourceLabel}</small></div> : null}{activeThread.category === "ช่วยเพื่อน" || activeThread.category === "ถามตอบ" ? <button type="button" className={styles.resolveButton} onClick={() => setThreads((previous) => previous.map((thread) => thread.id === activeThread.id ? { ...thread, resolved: !thread.resolved } : thread))}><GiCheckMark aria-hidden="true" />{activeThread.resolved ? "เปิดรับคำตอบอีกครั้ง · ตัวอย่าง" : "ทำเครื่องหมายว่าช่วยได้แล้ว · ตัวอย่าง"}</button> : null}<section className={styles.replies} aria-label="คำตอบในกระทู้"><h5>เสียงจากเพื่อนร่วมทาง <span>{activeThread.replies.length}</span></h5>{activeThread.replies.map((reply) => <div className={styles.reply} key={reply.id}><GiPlayerAvatar /><div><strong>{reply.author}</strong><p>{reply.body}</p></div></div>)}{!activeThread.replies.length ? <p className={styles.noReplies}>ยังไม่มีคำตอบ มาเป็นเพื่อนร่วมทางคนแรกกัน</p> : null}<form onSubmit={addReply} className={styles.replyForm}><label htmlFor="community-reply">ฝากคำตอบ<textarea id="community-reply" name="reply" required maxLength={2000} rows={3} placeholder="แบ่งปันคำแนะนำหรือถามเพื่อนต่อ…" /></label><button type="submit" className={styles.primary}>ส่งคำตอบตัวอย่าง <GiFeather aria-hidden="true" /></button></form><p className={styles.demoNote}>กระทู้และคำตอบอยู่เฉพาะการทดลองครั้งนี้ รีเฟรชแล้วเริ่มใหม่</p></section></article> : null}</div>
    </dialog>
  </section>;
}

function OwnGuildRoomView({ joinedGuild, onExploreGuilds, onSignIn, signingIn, loginError, onSignedOut }: { joinedGuild: string | null; onExploreGuilds: () => void; onSignIn: () => void; signingIn: boolean; loginError: string; onSignedOut: () => void }) {
  const [room, setRoom] = useState<RoomState>({ status: "loading" });
  const [roomAttempt, setRoomAttempt] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const displayError = signOutError || loginError;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/adventure/guild-room", { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) return { status: "anonymous" } as RoomState;
        if (response.status === 404) return { status: "no-guild" } as RoomState;
        if (!response.ok) throw new Error("service");
        const payload = await response.json() as { guild: GuildRoom };
        if (!payload.guild || typeof payload.guild.id !== "string" || !Array.isArray(payload.guild.rooms)) throw new Error("shape");
        return { status: "ready", guild: payload.guild } as RoomState;
      })
      .then((nextRoom) => { if (!controller.signal.aborted) setRoom(nextRoom); })
      .catch(() => { if (!controller.signal.aborted) setRoom({ status: "error", message: "ยังเปิดประตูโถงกิลด์ไม่ได้ ลองอีกครั้งได้ในอีกสักครู่" }); });
    return () => controller.abort();
  }, [roomAttempt]);

  const signOutMember = async () => {
    setSigningOut(true);
    setSignOutError("");
    try {
      const csrfResponse = await fetch("/api/adventure/member-auth/csrf", { cache: "no-store", credentials: "same-origin" });
      const csrf = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("csrf");
      const response = await fetch("/api/adventure/member-auth/signout", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: `${window.location.origin}/adventure?community=guild#community`, json: "true" }),
      });
      const result = await response.json() as { url?: string };
      if (!response.ok || !result.url) throw new Error("signout");
      const redirect = new URL(result.url, window.location.origin);
      if (redirect.origin !== window.location.origin) throw new Error("redirect");
      setRoom({ status: "anonymous" });
      onSignedOut();
      window.location.assign(redirect.toString());
    } catch {
      setSignOutError("ยังออกจากระบบสมาชิกไม่ได้ กรุณาลองอีกครั้ง");
      setSigningOut(false);
    }
  };

  return <div className={styles.guildView}>
      {room.status === "loading" || room.status === "idle" ? <div className={styles.guildGate} role="status"><GiCompass aria-hidden="true" /><h3>กำลังเปิดประตูโถงกิลด์…</h3><p>ตรวจสอบสมาชิกของคุณก่อนแสดงข้อมูลในกลุ่ม</p></div> : null}
      {room.status === "anonymous" ? <div className={styles.guildGate}><span className={styles.gateIcon}><GiPadlock aria-hidden="true" /></span><h3>เรื่องราวของกิลด์ เปิดให้สหายร่วมกลุ่มเท่านั้น</h3><p>เข้าสู่ระบบสมาชิกด้วย Discord เพื่อให้ระบบตรวจสอบกิลด์ของคุณ</p><button type="button" className={styles.primary} disabled={signingIn} onClick={onSignIn}>{signingIn ? "กำลังเปิดประตู…" : "เข้าสู่ระบบสมาชิกด้วย Discord"}</button>{displayError ? <p className={styles.error} role="alert">{displayError}</p> : null}<small>{joinedGuild ? "การเข้าร่วมกิลด์ตัวอย่างไม่ให้สิทธิ์เปิดข้อมูลกิลด์จริง" : "ระบบจะเปิดเฉพาะข้อมูลของกิลด์ที่คุณเป็นสมาชิกจริง"}</small></div> : null}
      {room.status === "no-guild" ? <div className={styles.guildGate}><GiThreeFriends aria-hidden="true" /><h3>คุณยังไม่มีกิลด์สำหรับการเดินทางครั้งนี้</h3><p>เมื่อมีสมาชิกกิลด์ในระบบแล้ว โถงส่วนตัวของคุณจะปรากฏที่นี่</p><button type="button" className={styles.primary} onClick={onExploreGuilds}>สำรวจทำเนียบกิลด์ตัวอย่าง</button></div> : null}
      {room.status === "error" ? <div className={styles.guildGate}><GiPadlock aria-hidden="true" /><h3>ประตูโถงกิลด์ยังไม่พร้อม</h3><p>{room.message}</p><button type="button" className={styles.primary} onClick={() => { setRoom({ status: "loading" }); setRoomAttempt((attempt) => attempt + 1); }}>ลองเปิดอีกครั้ง</button></div> : null}
      {room.status === "ready" ? <div className={styles.ownGuild}><div className={styles.memberSession}><span>เปิดข้อมูลด้วยบัญชีสมาชิกที่ยืนยันแล้ว</span><button type="button" className={styles.secondary} disabled={signingOut} onClick={signOutMember}>{signingOut ? "กำลังออกจากระบบ…" : "ออกจากระบบสมาชิก"}</button></div>{displayError ? <p className={styles.error} role="alert">{displayError}</p> : null}<header><span className={styles.gateIcon}><GiCompass aria-hidden="true" /></span><div><small>โถงเฉพาะสมาชิกกิลด์ของคุณ</small><h3>{room.guild.name}</h3><p>{room.guild.description || "บันทึกเรื่องราวบทใหม่ร่วมกับสหายของคุณ"}</p></div></header><div className={styles.ownGuildStats}><span>ตำแหน่งของคุณ <strong>{room.guild.yourPosition}</strong></span><span>นักผจญภัยในกิลด์ <strong>{room.guild.memberCount} คน</strong></span></div><h4>ห้องของกิลด์</h4>{room.guild.rooms.length ? <div className={styles.guildRoomLinks}>{room.guild.rooms.map((channel) => <a href={channel.url} key={channel.kind} target="_blank" rel="noopener noreferrer"><GiTalk aria-hidden="true" />{channel.label}<span aria-hidden="true">↗</span></a>)}</div> : <p className={styles.demoNote}>ยังไม่มีห้อง Discord ที่เปิดใช้สำหรับกิลด์นี้</p>}<div className={styles.privateEmpty}><GiOpenBook aria-hidden="true" /><h4>กระดานเรื่องราวของกิลด์</h4><p>พื้นที่กระทู้บนเว็บยังไม่มีข้อมูล ระบบแสดงเฉพาะข้อมูลกิลด์ที่ตรวจสิทธิ์แล้ว</p></div></div> : null}
    </div>;
}

function GiPlayerAvatar() {
  return <span className={styles.replyAvatar} aria-hidden="true"><GiThreeFriends /></span>;
}
