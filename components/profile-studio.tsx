"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  Check,
  ChevronRight,
  Disc3,
  Eye,
  EyeOff,
  GripVertical,
  Heart,
  Music2,
  Save,
  Sparkles,
  Utensils,
} from "@/components/icons";
import { SiteControls } from "@/components/site-controls";
import { useAppPreferences } from "@/components/app-preferences-provider";
import type { ProfileTheme, SiteLocale } from "@/lib/preferences";

type SectionType = "MUSIC" | "ACHIEVEMENTS" | "FOOD" | "CUSTOM";
type Layout = "GRID" | "LIST" | "STACK" | "BENTO" | "TIMELINE" | "VINYL" | "CASSETTE" | "RETRO_PLAYER" | "TROPHY_CASE" | "MARQUEE";
type SectionConfig = { type: SectionType; isVisible: boolean; layout: Layout };
type Song = { title: string; artist: string; album?: string };
type Food = { name: string; cuisine?: string; description?: string };
type CustomItem = { category: string; title: string; subtitle?: string; description?: string };

const layouts: Record<SectionType, Layout[]> = {
  MUSIC: ["VINYL", "CASSETTE", "RETRO_PLAYER", "LIST"],
  ACHIEVEMENTS: ["TROPHY_CASE", "GRID", "TIMELINE"],
  FOOD: ["BENTO", "GRID", "LIST"],
  CUSTOM: ["STACK", "GRID", "MARQUEE"],
};

const initialSections: SectionConfig[] = [
  { type: "MUSIC", isVisible: true, layout: "VINYL" },
  { type: "ACHIEVEMENTS", isVisible: true, layout: "TROPHY_CASE" },
  { type: "FOOD", isVisible: true, layout: "BENTO" },
  { type: "CUSTOM", isVisible: true, layout: "STACK" },
];

const themes: { id: ProfileTheme; name: string; colors: string[] }[] = [
  { id: "neon", name: "Neon Raid", colors: ["#b7ff3c", "#9b7cff", "#0b0e14"] },
  { id: "sakura", name: "Sakura Pop", colors: ["#ff789f", "#ffd9e4", "#442838"] },
  { id: "arcade", name: "Retro Arcade", colors: ["#5df2ff", "#ff4fd8", "#24144c"] },
  { id: "minimal", name: "Paper Mono", colors: ["#111111", "#e8e5dc", "#ffffff"] },
  { id: "fantasy", name: "Moon Fantasy", colors: ["#e8c36a", "#7596d8", "#11182d"] },
];

const copy = {
  th: { studio: "สตูดิโอโปรไฟล์", back: "กลับ Member Hub", preview: "ตัวอย่างโปรไฟล์", save: "บันทึกการตั้งค่า", saving: "กำลังบันทึก…", saved: "บันทึกลงบัญชีแล้ว", local: "บันทึกฉบับร่างบนเครื่องแล้ว", basics: "ข้อมูลหน้าโปรไฟล์", name: "ชื่อที่แสดง", headline: "คำแนะนำตัวสั้นๆ", bio: "เกี่ยวกับฉัน", theme: "ธีมโปรไฟล์", sections: "ส่วนที่แสดง", sectionsHint: "เปิด–ปิด เรียงลำดับ และเลือกรูปแบบของแต่ละส่วน", show: "แสดง", layout: "รูปแบบ", up: "เลื่อนขึ้น", down: "เลื่อนลง", content: "เนื้อหาที่ชอบ", song: "เพลงโปรด", artist: "ศิลปิน", food: "อาหารโปรด", cuisine: "ประเภทอาหาร", custom: "สิ่งอื่นที่อยากโชว์", customSub: "รายละเอียดสั้นๆ", live: "พรีวิวจะเปลี่ยนทันที", profileOf: "โปรไฟล์ของ", music: "เพลงที่ชอบ", achievements: "รางวัลสะสม", foods: "อาหารที่ชอบ", other: "เรื่องอื่นๆ", nowPlaying: "กำลังเล่น", verified: "ยืนยันโดย Me Guild", sampleHeadline: "Support main • นักล่ารางวัล • ชอบเล่นเกมรอบดึก", sampleBio: "ถ้าเกมไหนต้องใช้ทีมเวิร์ก เรียกฉันได้เสมอ กำลังตามหาเพื่อนร่วมทีมใหม่และร้านราเมงดีๆ", displayLanguage: "ภาษาและโหมดของเว็บอยู่มุมขวาบน" },
  zh: { studio: "个人主页工作室", back: "返回会员中心", preview: "主页预览", save: "保存设置", saving: "正在保存…", saved: "已保存到账户", local: "草稿已保存在此设备", basics: "主页资料", name: "显示名称", headline: "一句话介绍", bio: "关于我", theme: "主页主题", sections: "展示模块", sectionsHint: "显示、隐藏、排序并选择每个模块的样式", show: "显示", layout: "样式", up: "上移", down: "下移", content: "喜好内容", song: "喜欢的歌曲", artist: "歌手", food: "喜欢的食物", cuisine: "菜系", custom: "其他想展示的内容", customSub: "简短说明", live: "预览会即时更新", profileOf: "个人主页", music: "喜欢的音乐", achievements: "收藏成就", foods: "喜欢的食物", other: "其他喜好", nowPlaying: "正在播放", verified: "Me Guild 已验证", sampleHeadline: "辅助位 • 成就收藏家 • 深夜玩家", sampleBio: "需要团队合作的游戏都可以叫上我。我也在寻找新的队友和好吃的拉面店。", displayLanguage: "网站语言和模式可在右上角设置" },
  en: { studio: "Profile Studio", back: "Back to Member Hub", preview: "Profile preview", save: "Save settings", saving: "Saving…", saved: "Saved to your account", local: "Draft saved on this device", basics: "Profile details", name: "Display name", headline: "Short headline", bio: "About me", theme: "Profile theme", sections: "Visible sections", sectionsHint: "Show, hide, reorder, and choose a layout for every section", show: "Show", layout: "Layout", up: "Move up", down: "Move down", content: "Favorite content", song: "Favorite song", artist: "Artist", food: "Favorite food", cuisine: "Cuisine", custom: "Something else to show", customSub: "Short detail", live: "The preview updates instantly", profileOf: "Profile of", music: "Favorite music", achievements: "Achievement collection", foods: "Favorite food", other: "More about me", nowPlaying: "Now playing", verified: "Verified by Me Guild", sampleHeadline: "Support main • Achievement hunter • Late-night player", sampleBio: "If a game needs teamwork, count me in. Always looking for new squadmates and a great ramen place.", displayLanguage: "Website language and mode are in the top-right corner" },
  ja: { studio: "プロフィールスタジオ", back: "メンバーハブへ戻る", preview: "プロフィールプレビュー", save: "設定を保存", saving: "保存中…", saved: "アカウントに保存しました", local: "この端末に下書きを保存しました", basics: "プロフィール情報", name: "表示名", headline: "ひとこと", bio: "自己紹介", theme: "プロフィールテーマ", sections: "表示セクション", sectionsHint: "各セクションの表示、順番、レイアウトを変更できます", show: "表示", layout: "レイアウト", up: "上へ", down: "下へ", content: "好きなもの", song: "好きな曲", artist: "アーティスト", food: "好きな食べ物", cuisine: "ジャンル", custom: "ほかに表示したいもの", customSub: "短い説明", live: "プレビューはすぐに更新されます", profileOf: "プロフィール", music: "好きな音楽", achievements: "実績コレクション", foods: "好きな食べ物", other: "そのほか", nowPlaying: "再生中", verified: "Me Guild 認証済み", sampleHeadline: "サポートメイン • 実績ハンター • 深夜プレイヤー", sampleBio: "チームワークが必要なゲームならいつでも誘ってください。新しい仲間とおいしいラーメン屋を探しています。", displayLanguage: "サイトの言語とモードは右上で変更できます" },
} satisfies Record<SiteLocale, Record<string, string>>;

const sectionIcons = { MUSIC: Music2, ACHIEVEMENTS: Award, FOOD: Utensils, CUSTOM: Sparkles };

function Vinyl({ song, nowPlaying }: { song: Song; nowPlaying: string }) {
  return <div className="music-vinyl-card"><div className="vinyl-disc" aria-hidden="true"><div>{song.title.slice(0, 2).toUpperCase()}</div></div><div><span className="preview-eyebrow">{nowPlaying}</span><h3>{song.title}</h3><p>{song.artist}</p><div className="sound-bars" aria-hidden="true"><i /><i /><i /><i /><i />
  </div></div></div>;
}

function Cassette({ song }: { song: Song }) {
  return <div className="cassette-wrap"><div className="cassette" aria-hidden="true"><div className="cassette-label"><span>{song.title}</span><b>{song.artist}</b></div><div className="cassette-window"><i /><span /><i />
  </div></div><div><h3>{song.title}</h3><p>{song.artist} • MIX 01</p></div></div>;
}

function MusicSection({ layout, songs, label, nowPlaying }: { layout: Layout; songs: Song[]; label: string; nowPlaying: string }) {
  return <section className={`preview-section music-layout-${layout.toLowerCase()}`}><div className="preview-section-head"><Music2 size={18} /><h2>{label}</h2><span>03 TRACKS</span></div>
    {layout === "VINYL" && <Vinyl song={songs[0]} nowPlaying={nowPlaying} />}
    {layout === "CASSETTE" && <Cassette song={songs[0]} />}
    {layout === "RETRO_PLAYER" && <div className="retro-player"><div className="retro-screen"><span>TRACK 01</span><strong>{songs[0].title}</strong><small>{songs[0].artist}</small></div><div className="retro-progress"><i />
    </div><div className="retro-tabs">{songs.map((song, index) => <button type="button" key={song.title}><span>0{index + 1}</span>{song.title}</button>)}</div></div>}
    {layout === "LIST" && <div className="profile-list">{songs.map((song, index) => <div key={song.title}><span>0{index + 1}</span><Disc3 size={18} /><p><strong>{song.title}</strong><small>{song.artist}</small></p><ChevronRight size={16} />
    </div>)}</div>}
  </section>;
}

function AchievementSection({ layout, label, verified }: { layout: Layout; label: string; verified: string }) {
  const items = [{ icon: "✦", name: "Night Owl", rarity: "LEGENDARY" }, { icon: "Ⅲ", name: "Squad Builder", rarity: "EPIC" }, { icon: "★", name: "Guild Clash", rarity: "RARE" }];
  return <section className={`preview-section achievement-layout-${layout.toLowerCase()}`}><div className="preview-section-head"><Award size={18} /><h2>{label}</h2><span>3 / 24</span></div><div className="achievement-items">{items.map((item, index) => <article key={item.name}><div className="achievement-medal"><span>{item.icon}</span></div><div><b>{item.name}</b><small>{item.rarity}</small>{layout === "TIMELINE" && <p>{verified} • S0{index + 1}</p>}</div></article>)}</div></section>;
}

function FoodSection({ layout, foods, label }: { layout: Layout; foods: Food[]; label: string }) {
  return <section className={`preview-section food-layout-${layout.toLowerCase()}`}><div className="preview-section-head"><Utensils size={18} /><h2>{label}</h2><span>MY PICKS</span></div><div className="food-items">{foods.map((food, index) => <article key={food.name}><div className={`food-art food-art-${index + 1}`} aria-hidden="true"><span>{["🍜", "🍣", "🥭"][index]}</span></div><div><b>{food.name}</b><small>{food.cuisine}</small>{layout !== "LIST" && <p>{food.description}</p>}</div></article>)}</div></section>;
}

function CustomSection({ layout, items, label }: { layout: Layout; items: CustomItem[]; label: string }) {
  return <section className={`preview-section custom-layout-${layout.toLowerCase()}`}><div className="preview-section-head"><Heart size={18} /><h2>{label}</h2><span>PERSONAL</span></div><div className="custom-items">{items.map((item, index) => <article key={`${item.title}-${index}`}><span>{["01", "02", "03"][index] ?? "++"}</span><div><b>{item.title}</b><small>{item.subtitle}</small></div></article>)}</div></section>;
}

function safePreviewImage(value: string) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}

function ProfilePreview({ name, headline, bio, avatarUrl, bannerUrl, theme, sections, songs, foods, customItems, locale }: { name: string; headline: string; bio: string; avatarUrl: string; bannerUrl: string; theme: ProfileTheme; sections: SectionConfig[]; songs: Song[]; foods: Food[]; customItems: CustomItem[]; locale: SiteLocale }) {
  const text = copy[locale];
  const avatar = safePreviewImage(avatarUrl);
  const banner = safePreviewImage(bannerUrl);
  return <article className="profile-preview" data-profile-theme={theme} aria-label={`${text.profileOf} ${name}`}>
    <div className="profile-cover">{banner && <Image src={banner} alt="" fill unoptimized className="object-cover" referrerPolicy="no-referrer" />}<div className="profile-cover-grid" /><span className="profile-season">PLAYER CARD • S01</span><div className="profile-status"><i /> ONLINE</div></div>
    <header className="profile-identity"><div className="profile-avatar">{avatar ? <Image src={avatar} alt="" width={96} height={96} unoptimized className="size-full rounded-[inherit] object-cover" referrerPolicy="no-referrer" /> : <span>{name.slice(0, 2).toUpperCase()}</span>}<i aria-hidden="true" />
    </div><div className="profile-copy"><div className="flex flex-wrap items-center gap-2"><h1>{name || "Player"}</h1><span className="locale-badge">{locale.toUpperCase()}</span></div><p className="profile-headline">{headline}</p><p className="profile-bio">{bio}</p><div className="profile-stats"><span><b>27</b> LEVEL</span><span><b>184</b> MATCHES</span><span><b>12</b> BADGES</span></div></div></header>
    <div className="profile-sections">{sections.filter(section => section.isVisible).map(section => {
      if (section.type === "MUSIC") return <MusicSection key={section.type} layout={section.layout} songs={songs} label={text.music} nowPlaying={text.nowPlaying} />;
      if (section.type === "ACHIEVEMENTS") return <AchievementSection key={section.type} layout={section.layout} label={text.achievements} verified={text.verified} />;
      if (section.type === "FOOD") return <FoodSection key={section.type} layout={section.layout} foods={foods} label={text.foods} />;
      return <CustomSection key={section.type} layout={section.layout} items={customItems} label={text.other} />;
    })}</div>
  </article>;
}

export function ProfileStudio({ signedIn, initialName, initialAvatar }: { signedIn: boolean; initialName: string; initialAvatar?: string | null }) {
  const { locale, colorMode } = useAppPreferences();
  const text = copy[locale];
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState(text.sampleHeadline);
  const [bio, setBio] = useState(text.sampleBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar ?? "");
  const [bannerUrl, setBannerUrl] = useState("");
  const [theme, setTheme] = useState<ProfileTheme>("neon");
  const [sections, setSections] = useState(initialSections);
  const [songs, setSongs] = useState<Song[]>([{ title: "Midnight City", artist: "M83", album: "Hurry Up, We're Dreaming" }, { title: "Plastic Love", artist: "Mariya Takeuchi" }, { title: "Shelter", artist: "Porter Robinson" }]);
  const [foods, setFoods] = useState<Food[]>([{ name: "Tonkotsu Ramen", cuisine: "Japanese", description: "Rich broth • extra egg" }, { name: "Salmon Sushi", cuisine: "Japanese", description: "Fresh and simple" }, { name: "Mango Sticky Rice", cuisine: "Thai", description: "The perfect late-night reward" }]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([{ category: "HOBBY", title: "Street photography", subtitle: "Night city collector" }, { category: "PET", title: "Mochi the cat", subtitle: "Party supervisor" }, { category: "MOOD", title: "Rainy playlists", subtitle: "+ ranked games" }]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "local" | "error">("idle");
  const [loaded, setLoaded] = useState(!signedIn);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const local = localStorage.getItem("me-guild-profile-draft");
    if (!signedIn && local) {
      try {
        const draft = JSON.parse(local);
        queueMicrotask(() => {
          if (cancelled) return;
          if (draft.name) setName(draft.name);
          if (draft.headline) setHeadline(draft.headline);
          if (draft.bio) setBio(draft.bio);
          if (themes.some((item) => item.id === draft.theme)) setTheme(draft.theme as ProfileTheme);
          if (Array.isArray(draft.sections)) setSections(draft.sections);
          if (Array.isArray(draft.songs)) setSongs(draft.songs);
          if (Array.isArray(draft.foods)) setFoods(draft.foods);
          if (Array.isArray(draft.customItems)) setCustomItems(draft.customItems);
        });
      } catch { /* Ignore an invalid local draft. */ }
      return () => { cancelled = true; };
    }
    if (!signedIn) return () => { cancelled = true; };
    void fetch("/api/profile/settings", { cache: "no-store" }).then(response => { if (!response.ok) throw new Error("PROFILE_LOAD_FAILED"); return response.json(); }).then(data => {
      if (cancelled) return;
      setLoaded(true);
      const profile = data?.profile;
      if (!profile) return;
      setName(profile.displayName ?? initialName);
      setHeadline(profile.headline ?? text.sampleHeadline);
      setBio(profile.bio ?? text.sampleBio);
      setAvatarUrl(profile.avatarUrl ?? "");
      setBannerUrl(profile.bannerUrl ?? "");
      const savedTheme = profile.preference?.profileTheme?.toLowerCase();
      if (themes.some((item) => item.id === savedTheme)) setTheme(savedTheme as ProfileTheme);
      if (Array.isArray(profile.sections) && profile.sections.length) {
        setSections(profile.sections.filter((section: SectionConfig) => section.type in layouts).map((section: SectionConfig) => ({
          ...section,
          layout: section.layout.toUpperCase() as Layout,
          type: section.type.toUpperCase() as SectionType,
        })));
      }
      if (profile.songs?.length) setSongs(profile.songs);
      if (profile.foods?.length) setFoods(profile.foods);
      if (profile.customItems?.length) setCustomItems(profile.customItems);
    }).catch(() => { if (!cancelled) setProfileError("โหลดโปรไฟล์ไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่ก่อนบันทึก"); });
    return () => { cancelled = true; };
  }, [initialName, signedIn, text.sampleBio, text.sampleHeadline]);

  const draft = useMemo(() => ({ name, headline, bio, avatarUrl, bannerUrl, theme, sections, songs, foods, customItems }), [name, headline, bio, avatarUrl, bannerUrl, theme, sections, songs, foods, customItems]);

  const updateSection = (type: SectionType, patch: Partial<SectionConfig>) => setSections(current => current.map(section => section.type === type ? { ...section, ...patch } : section));
  const moveSection = (index: number, direction: -1 | 1) => setSections(current => { const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current];[next[index], next[target]] = [next[target], next[index]]; return next; });

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loaded || status === "saving") return;
    setStatus("saving");
    setProfileError("");
    if (!signedIn) localStorage.setItem("me-guild-profile-draft", JSON.stringify(draft));
    const response = signedIn ? await fetch("/api/profile/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: { displayName: name, headline, bio, avatarUrl, bannerUrl }, preferences: { locale, colorMode, profileTheme: theme }, sections, songs, foods, customItems }) }).catch(() => null) : null;
    setStatus(response?.ok ? "saved" : signedIn ? "error" : "local");
    if (signedIn && !response?.ok) setProfileError(response?.status === 401 ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้งก่อนบันทึก" : "ยังบันทึกลงบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง");
  }

  return <main className="profile-studio">
    <header className="studio-topbar"><div className="flex items-center gap-3"><Link href={signedIn ? "/member" : "/"} className="studio-icon-button" aria-label={text.back}><ArrowLeft size={18} />
    </Link><div><p className="font-display text-sm font-bold tracking-[.08em]">{text.studio}</p><p className="text-[.66rem] opacity-55">{text.live}</p></div></div><div className="flex items-center gap-2"><SiteControls /><button type="submit" form="profile-settings-form" className="studio-save"><Save size={16} /><span className="hidden sm:inline">{status === "saving" ? text.saving : text.save}</span></button></div></header>
    <div className="studio-layout">
      <form id="profile-settings-form" method="post" onSubmit={saveProfile} className="studio-editor">
        <div className="studio-intro"><span className="studio-step">01</span><div><h1>{text.basics}</h1><p>{text.displayLanguage}</p></div></div>
        <fieldset className="studio-fieldset"><legend>{text.basics}</legend><div className="studio-field"><label htmlFor="profile-name">{text.name}</label><input id="profile-name" name="displayName" value={name} onChange={event => setName(event.target.value)} maxLength={80} required autoComplete="nickname" />
        </div><div className="studio-field"><label htmlFor="profile-headline">{text.headline}</label><input id="profile-headline" name="headline" value={headline} onChange={event => setHeadline(event.target.value)} maxLength={120} />
          </div><div className="studio-field"><label htmlFor="profile-bio">{text.bio}</label><textarea id="profile-bio" name="bio" value={bio} onChange={event => setBio(event.target.value)} maxLength={500} rows={4} />
          </div></fieldset>

        <fieldset className="studio-fieldset"><legend>{text.theme}</legend><div className="theme-options">{themes.map(item => <label key={item.id} className={`theme-option ${theme === item.id ? "selected" : ""}`}><input type="radio" name="profileTheme" value={item.id} checked={theme === item.id} onChange={() => setTheme(item.id)} /><span className="theme-swatches">{item.colors.map(color => <i key={color} style={{ background: color }} />)}</span><b>{item.name}</b>{theme === item.id && <Check size={15} />}</label>)}</div></fieldset>

        <fieldset className="studio-fieldset"><legend>{text.sections}</legend><p className="fieldset-hint">{text.sectionsHint}</p><div className="section-controls">{sections.map((section, index) => {
          const Icon = sectionIcons[section.type]; return <article key={section.type} className="section-control"><GripVertical size={17} className="section-grip" aria-hidden="true" /><span className="section-icon"><Icon size={17} />
          </span><div className="section-control-copy"><strong>{text[section.type === "MUSIC" ? "music" : section.type === "ACHIEVEMENTS" ? "achievements" : section.type === "FOOD" ? "foods" : "other"]}</strong><label htmlFor={`layout-${section.type}`} className="sr-only">{text.layout}</label><select id={`layout-${section.type}`} name={`layout-${section.type}`} value={section.layout} onChange={event => updateSection(section.type, { layout: event.target.value as Layout })}>{layouts[section.type].map(layout => <option key={layout} value={layout}>{layout.replace("_", " ")}</option>)}</select></div><div className="section-actions"><button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label={`${text.up}: ${section.type}`}><ArrowUp size={14} />
          </button><button type="button" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1} aria-label={`${text.down}: ${section.type}`}><ArrowDown size={14} />
              </button><label className="visibility-toggle"><input type="checkbox" checked={section.isVisible} onChange={event => updateSection(section.type, { isVisible: event.target.checked })} /><span>{section.isVisible ? <Eye size={15} /> : <EyeOff size={15} />}<i>{text.show}</i></span></label></div></article>
        })}</div></fieldset>

        <fieldset className="studio-fieldset"><legend>{text.content}</legend><div className="studio-field"><label htmlFor="favorite-song">{text.song}</label><input id="favorite-song" name="favoriteSong" value={songs[0].title} onChange={event => setSongs(current => current.map((song, index) => index === 0 ? { ...song, title: event.target.value } : song))} maxLength={120} />
        </div><div className="studio-field"><label htmlFor="favorite-artist">{text.artist}</label><input id="favorite-artist" name="favoriteArtist" value={songs[0].artist} onChange={event => setSongs(current => current.map((song, index) => index === 0 ? { ...song, artist: event.target.value } : song))} maxLength={120} />
          </div><div className="studio-field-grid"><div className="studio-field"><label htmlFor="favorite-food">{text.food}</label><input id="favorite-food" name="favoriteFood" value={foods[0].name} onChange={event => setFoods(current => current.map((food, index) => index === 0 ? { ...food, name: event.target.value } : food))} maxLength={120} />
          </div><div className="studio-field"><label htmlFor="favorite-cuisine">{text.cuisine}</label><input id="favorite-cuisine" name="favoriteCuisine" value={foods[0].cuisine ?? ""} onChange={event => setFoods(current => current.map((food, index) => index === 0 ? { ...food, cuisine: event.target.value } : food))} maxLength={80} />
            </div></div><div className="studio-field"><label htmlFor="custom-title">{text.custom}</label><input id="custom-title" name="customTitle" value={customItems[0].title} onChange={event => setCustomItems(current => current.map((item, index) => index === 0 ? { ...item, title: event.target.value } : item))} maxLength={120} />
          </div><div className="studio-field"><label htmlFor="custom-subtitle">{text.customSub}</label><input id="custom-subtitle" name="customSubtitle" value={customItems[0].subtitle ?? ""} onChange={event => setCustomItems(current => current.map((item, index) => index === 0 ? { ...item, subtitle: event.target.value } : item))} maxLength={120} />
          </div></fieldset>
        <fieldset className="studio-fieldset"><legend>รูปโปรไฟล์และภาพปก</legend><div className="studio-field"><label htmlFor="profile-avatar-url">ลิงก์รูปโปรไฟล์</label><input id="profile-avatar-url" name="avatarUrl" type="url" value={avatarUrl} onChange={event => setAvatarUrl(event.target.value)} maxLength={500} placeholder="https://…" />
        </div><div className="studio-field"><label htmlFor="profile-banner-url">ลิงก์ภาพปก</label><input id="profile-banner-url" name="bannerUrl" type="url" value={bannerUrl} onChange={event => setBannerUrl(event.target.value)} maxLength={500} placeholder="https://…" />
          </div></fieldset>
        <Link href="/forgot-password" className="text-sm underline underline-offset-4">เปลี่ยนรหัสผ่านของบัญชี</Link>
        <button type="submit" disabled={!loaded || status === "saving"} className="studio-save studio-save-wide disabled:opacity-50"><Save size={16} />{status === "saving" ? text.saving : text.save}</button><p className="studio-status" aria-live="polite">{status === "saved" ? text.saved : status === "local" ? text.local : ""}</p>{profileError && <p role="alert" className="text-sm text-red-400">{profileError} <Link href="/login?callbackUrl=/profile" className="underline">เข้าสู่ระบบ</Link></p>}
      </form>
      <section className="studio-preview-panel" aria-labelledby="preview-heading"><div className="preview-toolbar"><div><span className="preview-live-dot" /><h2 id="preview-heading">{text.preview}</h2></div><span>1280 × AUTO</span></div><div className="preview-canvas"><ProfilePreview name={name} headline={headline} bio={bio} avatarUrl={avatarUrl} bannerUrl={bannerUrl} theme={theme} sections={sections} songs={songs} foods={foods} customItems={customItems} locale={locale} />
      </div></section>
    </div>
  </main>;
}

