"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Tilt from "react-parallax-tilt";
import { animate, stagger } from "animejs";
import { GiCompass, GiOpenBook, GiThreeFriends, GiGamepad, GiScrollUnfurled, GiPencil, GiCastle, GiSparkles, GiTalk, GiCheckMark, GiHeartPlus } from "react-icons/gi";
import { DEFAULT_COMMUNITY_PROJECT_COVER, parseCommunityProjectPublic, type CommunityProjectContent, type CommunityProjectPublic } from "@/lib/community-project-policy";
import styles from "./headquarters-project.module.css";

export function createHeadquartersStarter(): CommunityProjectContent {
  return {
    title: "โครงการสร้างศูนย์กลาง Me Guild",
    summary: "พื้นที่ที่คนรักเกม หนังสือ และการสร้างสรรค์ ได้มาพบกันในกรุงเทพฯ",
    body: "เราอยากชวนทุกคนร่วมคิดถึงพื้นที่ที่ได้พบเพื่อน แลกเปลี่ยนความรู้ และลงมือสร้างสิ่งที่รักด้วยกัน แนวคิดนี้อยู่ระหว่างรับฟังความต้องการของชุมชน ยังไม่มีสถานที่หรือกำหนดเปิดที่ยืนยันแล้ว",
    locationLabel: "แนวคิดพื้นที่ในกรุงเทพฯ · ยังไม่ระบุสถานที่",
    stage: "CONCEPT", coverMediaId: null, galleryMediaIds: [],
    spaces: [
      { id: "library", title: "ห้องสมุดและพื้นที่เรียนรู้", description: "มุมหนังสือ พื้นที่อ่าน และกิจกรรมแลกเปลี่ยนความรู้ จากเกม หนังสือ และงานสร้างสรรค์" },
      { id: "workshop", title: "พื้นที่เกมและเวิร์กช็อป", description: "พื้นที่เล่นเกม พบเพื่อน และเวิร์กช็อปสำหรับคนชอบสร้าง ทั้งในโลกเกมและโลกจริง" },
      { id: "courtyard", title: "ลานกิจกรรมของชุมชน", description: "พื้นที่สำหรับงานพบปะ พูดคุย ฉายผลงาน และกิจกรรมที่เชื่อมคนรักสิ่งเดียวกันเข้าด้วยกัน" },
    ],
    milestones: [
      { id: "listen", title: "รับฟังความต้องการ", description: "รวบรวมความคิดเห็นและไอเดียจากสมาชิกในชุมชน ว่าอยากให้ศูนย์กลาง Me Guild เป็นพื้นที่แบบไหน", state: "CURRENT" },
      { id: "design", title: "ศึกษาและออกแบบ", description: "นำความคิดเห็นมาศึกษาความเป็นไปได้ และออกแบบแนวทางที่เหมาะสม ทั้งด้านการใช้งาน บรรยากาศ และผลกระทบต่อชุมชนโดยรอบ", state: "PLANNED" },
      { id: "plan", title: "วางแผนพื้นที่และงบประมาณ", description: "พิจารณาทางเลือกของพื้นที่ จัดทำแผนการใช้พื้นที่เบื้องต้น และประเมินงบประมาณอย่างรอบคอบ โปร่งใส และเป็นไปได้จริง", state: "PLANNED" },
      { id: "open", title: "เปิดพื้นที่เมื่อพร้อม", description: "เมื่อทุกอย่างพร้อม ทั้งด้านสถานที่ งบประมาณ และการดูแลระยะยาว เราจะเปิดศูนย์กลาง Me Guild ให้เป็นพื้นที่ของทุกคน", state: "PLANNED" },
    ],
    supportUrl: null, supportLabel: "ดูรายละเอียดการสนับสนุน", supportNotice: "โครงการยังเป็นแนวคิด และยังไม่เปิดรับเงิน หากมีแนวทางสนับสนุนในอนาคต เราจะเปิดเผยรายละเอียดให้ตรวจสอบก่อนเสมอ",
    updates: [],
    transparencyNotes: ["แผนการใช้พื้นที่ — แนวคิดการใช้พื้นที่ ฟังก์ชันต่าง ๆ และการปรับปรุงให้เหมาะกับชุมชน", "งบประมาณและการใช้เงิน — จะเปิดเผยรายละเอียดก่อนมีการเปิดรับการสนับสนุน", "ความคืบหน้าตามจริง — อัปเดตโครงการตามสถานการณ์จริง โดยแยกแนวคิดออกจากสิ่งที่ยืนยันแล้ว"],
  };
}

export function headquartersPreview(content: CommunityProjectContent, slug = "me-guild-bangkok", media: { id: string; url: string; alt: string; caption: string; kind: "CONCEPT" | "PHOTO" | "REFERENCE"; width: number; height: number }[] = []): CommunityProjectPublic {
  const { coverMediaId, galleryMediaIds, ...publicContent } = content;
  const publicImage = ({ url, alt, caption, kind, width, height }: (typeof media)[number]) => ({ url, alt, caption, kind, width, height });
  const cover = media.find((item) => item.id === coverMediaId);
  return { ...publicContent, slug, coverImage: cover ? publicImage(cover) : DEFAULT_COMMUNITY_PROJECT_COVER, galleryImages: galleryMediaIds.flatMap((id) => { const item = media.find((entry) => entry.id === id); return item ? [publicImage(item)] : []; }), updatedAt: new Date().toISOString(), publishedAt: new Date().toISOString() };
}

const stageLabels = { CONCEPT: "อยู่ระหว่างพัฒนาแนวคิด", PLANNING: "อยู่ระหว่างวางแผน", DESIGN: "อยู่ระหว่างออกแบบ", BUILDING: "อยู่ระหว่างจัดทำพื้นที่", OPEN: "เปิดพื้นที่แล้ว" };
const spaceAssets = ["/adventure/headquarters-library.webp", "/adventure/headquarters-workshop.webp", "/adventure/headquarters-courtyard.webp"];
const spaceIcons = [GiOpenBook, GiGamepad, GiThreeFriends];
const milestoneIcons = [GiTalk, GiPencil, GiCompass, GiCastle];
type Props = { project?: CommunityProjectPublic; preview?: boolean; slug?: string };
type Loaded = { kind: "loading" } | { kind: "ready"; project: CommunityProjectPublic } | { kind: "preview" } | { kind: "missing" } | { kind: "error"; message: string };

export function HeadquartersProject({ project, preview = false, slug = "me-guild-bangkok" }: Props) {
  if (project) return <ProjectPresentation project={project} preview={preview} />;
  return <ProjectLoader key={slug} slug={slug} />;
}

function ProjectLoader({ slug }: { slug: string }) {
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const isHeadquarters = slug === "me-guild-bangkok";
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      controller.abort();
      setLoaded({ kind: "error", message: "การเชื่อมต่อใช้เวลานาน กรุณาลองโหลดข้อมูลโครงการใหม่" });
    }, 12_000);
    fetch(`/api/adventure/projects/${encodeURIComponent(slug)}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404) { if (!controller.signal.aborted) setLoaded({ kind: isHeadquarters ? "preview" : "missing" }); return; }
        if (!response.ok) throw new Error("ยังโหลดข้อมูลโครงการไม่ได้ กรุณาลองอีกครั้งเมื่อบริการพร้อม");
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" || !("project" in payload)) throw new Error("ข้อมูลโครงการไม่สมบูรณ์ กรุณาลองโหลดใหม่");
        const parsed = parseCommunityProjectPublic(payload.project);
        if (!controller.signal.aborted) setLoaded({ kind: "ready", project: parsed });
      }).catch((error: unknown) => { if (!controller.signal.aborted) setLoaded({ kind: "error", message: error instanceof Error ? error.message : "โหลดข้อมูลโครงการไม่สำเร็จ" }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [slug, attempt, isHeadquarters]);
  if (loaded.kind === "ready") return <ProjectPresentation project={loaded.project} preview={false} />;
  const retry = () => { setLoaded({ kind: "loading" }); setAttempt((value) => value + 1); };
  if (isHeadquarters) return <ProjectPresentation project={headquartersPreview(createHeadquartersStarter(), slug)} preview loadStatus={{ text: loaded.kind === "loading" ? "กำลังตรวจข้อมูลเผยแพร่ · ขณะนี้แสดงตัวอย่างแนวคิด" : loaded.kind === "error" ? "ยังโหลดบันทึกเผยแพร่ไม่ได้ · ขณะนี้แสดงตัวอย่างแนวคิด" : "แนวคิดโครงการ · ยังไม่เปิดรับเงิน", ...(loaded.kind === "error" ? { retry } : {}) }} />;
  return <div className={styles.page}><Masthead /><main className={styles.loadState} aria-busy={loaded.kind === "loading"}><GiCastle aria-hidden="true" /><h1>{loaded.kind === "loading" ? "กำลังเปิดบันทึกโครงการ…" : loaded.kind === "missing" ? "ยังไม่พบโครงการที่เผยแพร่" : "ยังเปิดบันทึกโครงการไม่ได้"}</h1>{loaded.kind === "missing" && <p>โครงการนี้อาจยังไม่เผยแพร่ หรือเก็บเข้าคลังแล้ว</p>}{loaded.kind === "error" && <><p role="alert">{loaded.message}</p><div className={styles.actions}><button type="button" onClick={retry}>ลองโหลดใหม่</button></div></>}</main></div>;
}

function Masthead() {
  return <><header className={styles.masthead}><Link href="/adventure" className={styles.brand}><GiCompass aria-hidden="true" /><span>Me Guild</span></Link><nav aria-label="นำทางโครงการ"><a href="#project-story"><GiOpenBook aria-hidden="true" />เรื่องราว</a><a href="#project-roadmap"><GiCompass aria-hidden="true" />แผนโครงการ</a><a href="#project-support"><GiThreeFriends aria-hidden="true" />ร่วมสร้าง</a><Link href="/adventure" className={styles.home}><GiCastle aria-hidden="true" />กลับหอชุมชน</Link></nav></header><nav className={styles.memberBar} aria-label="บัญชีนักผจญภัย"><span>บัญชีนักผจญภัย</span><Link href="/adventure/login">เข้าสู่ระบบด้วย Discord</Link><Link href="/adventure/raffles">ส่งตั๋วชิงโชค →</Link></nav></>;
}

function ProjectPresentation({ project, preview, loadStatus }: { project: CommunityProjectPublic; preview: boolean; loadStatus?: { text: string; retry?: () => void } }) {
  const [motion, setMotion] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!preference.matches);
    update(); preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!motion || !root.current) return;
    const nodes = root.current.querySelectorAll<HTMLElement>("[data-project-reveal]");
    const animations: ReturnType<typeof animate>[] = [];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animations.push(animate(entry.target, { opacity: [0.55, 1], translateY: [18, 0], duration: 650, ease: "out(3)", delay: stagger(50) }));
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => { observer.disconnect(); animations.forEach((animation) => animation.revert()); };
  }, [motion]);
  const copyLink = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/adventure/projects/${encodeURIComponent(project.slug)}`); setCopied(true); setCopyError(""); } catch { setCopied(false); setCopyError("คัดลอกไม่ได้ กรุณาคัดลอกที่อยู่หน้านี้จากแถบที่อยู่"); } };
  return <div ref={root} className={styles.page}>
    <Masthead />
    {preview && <div className={styles.sourceBanner}><GiScrollUnfurled aria-hidden="true" /><span>ตัวอย่างหน้าโครงการ · รอข้อมูลเผยแพร่จากผู้จัด</span>{loadStatus && <span role="status">{loadStatus.text}</span>}{loadStatus?.retry && <button type="button" onClick={loadStatus.retry}>ลองตรวจข้อมูลใหม่</button>}</div>}
    <main>
      <section id="project-story" className={styles.hero} aria-labelledby="project-title">
        <div className={styles.heroCopy} data-project-reveal><span className={styles.eyebrow}><GiSparkles aria-hidden="true" />{stageLabels[project.stage]}</span><h1 id="project-title">{project.title}</h1><p className={styles.summary}>{project.summary}</p><p className={styles.location}>{project.locationLabel}</p><div className={styles.actions}><a href="#project-roadmap"><GiCompass aria-hidden="true" />ดูแผนโครงการ<span aria-hidden="true">›</span></a><a href="#project-support" className={styles.outline}><GiThreeFriends aria-hidden="true" />ดูแนวทางร่วมสร้าง<span aria-hidden="true">›</span></a></div><div className={styles.ornament} aria-hidden="true"><span />✦<span /></div></div>
        <figure className={styles.heroFigure} data-project-reveal><Tilt tiltEnable={motion} tiltMaxAngleX={2} tiltMaxAngleY={2} scale={1} transitionSpeed={900} className={styles.heroTilt}><Image src={project.coverImage.url} alt={project.coverImage.alt} width={project.coverImage.width} height={project.coverImage.height} preload unoptimized className={styles.heroImage} /></Tilt><figcaption>{project.coverImage.kind === "CONCEPT" ? "ภาพแนวคิด · ไม่ใช่ภาพสถานที่จริง" : project.coverImage.kind === "REFERENCE" ? "ภาพอ้างอิง" : "ภาพถ่าย"}{project.coverImage.caption && project.coverImage.caption !== "ภาพแนวคิด · ไม่ใช่ภาพสถานที่จริง" ? ` · ${project.coverImage.caption}` : ""}</figcaption></figure>
      </section>
      <section className={styles.spaces} aria-labelledby="project-spaces" data-project-reveal><h2 id="project-spaces" className={styles.sectionHeading}><span aria-hidden="true">✧</span>พื้นที่สำหรับเรื่องราวของทุกคน<span aria-hidden="true">✧</span></h2>{project.body && <p className={styles.story}>{project.body}</p>}<div className={styles.spaceGrid}>{project.spaces.map((space, index) => { const Icon = spaceIcons[index % spaceIcons.length]; return <article key={space.id}>{index < 3 && project.slug === "me-guild-bangkok" && project.stage === "CONCEPT" && ["library", "workshop", "courtyard"][index] === space.id && <figure><Image src={spaceAssets[index]} width={1000} height={563} alt={`ภาพแนวคิด${space.title}`} unoptimized /><figcaption>ภาพแนวคิด · ไม่ใช่สถานที่จริง</figcaption></figure>}<div className={styles.spaceText}><span className={styles.goldIcon}><Icon aria-hidden="true" /></span><div><h3>{space.title}</h3><p>{space.description}</p></div></div></article>; })}</div></section>
      <section id="project-roadmap" className={styles.roadmap} aria-labelledby="project-roadmap-title" data-project-reveal><h2 id="project-roadmap-title" className={styles.sectionHeading}><span aria-hidden="true">✧</span><span><em>ก้าวเล็ก ๆ</em> สู่ศูนย์กลาง Me Guild</span><span aria-hidden="true">✧</span></h2><p className={styles.sectionIntro}>เราเดินไปทีละก้าว อย่างรอบคอบ และรับฟังจากทุกคนในชุมชน<br />เพื่อให้ศูนย์กลาง Me Guild เกิดขึ้นได้จริง และอยู่กับพวกเราในระยะยาว</p><ol className={styles.steps}>{project.milestones.map((milestone, index) => { const Icon = milestoneIcons[index % milestoneIcons.length]; return <li key={milestone.id} data-state={milestone.state}><span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span><Icon className={styles.stepIcon} aria-hidden="true" /><h3>{milestone.title}</h3><span className={styles.stepState}>{milestone.state === "DONE" ? <><GiCheckMark aria-hidden="true" />ดำเนินการแล้ว</> : milestone.state === "CURRENT" ? "ขั้นตอนปัจจุบัน" : "แนวทางถัดไป"}</span><p>{milestone.description}</p></li>; })}</ol></section>
      <section id="project-support" className={styles.support} aria-labelledby="project-support-title" data-project-reveal><h2 id="project-support-title" className={styles.sectionHeading}><span aria-hidden="true">✧</span><span><em>ร่วมสร้างได้</em> ในแบบที่สะดวก</span><span aria-hidden="true">✧</span></h2><p className={styles.sectionIntro}>ทุกคนเป็นส่วนหนึ่งของชุมชนได้ โดยไม่จำเป็นต้องสนับสนุนเงิน</p><div className={styles.supportGrid}><article><GiSparkles aria-hidden="true" /><div><h3>แบ่งปันไอเดีย</h3><p>เล่าไอเดีย ความคิดเห็น หรือสิ่งที่อยากเห็นในศูนย์กลาง Me Guild เพื่อช่วยให้โครงการนี้ตอบโจทย์ชุมชนมากที่สุด</p><Link href="/adventure?community=knowledge#community">ไปพูดคุยในหอชุมชน <span aria-hidden="true">›</span></Link></div></article><article><GiCompass aria-hidden="true" /><div><h3>ช่วยบอกต่อโครงการ</h3><p>แชร์ให้เพื่อน ๆ ที่สนใจ รับรู้และติดตามความคืบหน้า เพื่อให้โครงการเป็นที่รู้จักในหมู่คนที่รักชุมชนเดียวกัน</p><button type="button" onClick={copyLink}>{copied ? "คัดลอกลิงก์แล้ว" : "คัดลอกลิงก์โครงการ"}</button><span role="status" className={styles.copyStatus}>{copied ? "พร้อมส่งต่อให้เพื่อนแล้ว" : copyError}</span></div></article><article><GiHeartPlus aria-hidden="true" /><div><h3>{project.supportUrl ? "สนับสนุนตามสมัครใจ" : "ยังไม่เปิดรับเงิน"}</h3><p>{project.supportNotice}</p>{project.supportUrl && !preview ? <a href={project.supportUrl} target="_blank" rel="noopener noreferrer">{project.supportLabel} <span aria-hidden="true">↗</span></a> : <span className={styles.supportNotice}>เปิดเผยรายละเอียดก่อนเปิดรับการสนับสนุน</span>}</div></article></div></section>
      <section className={styles.records} aria-label="บันทึกและข้อมูลโครงการ"><div data-project-reveal><div className={styles.recordHeading}><GiOpenBook aria-hidden="true" /><div><h2>บันทึกการเดินทาง</h2><p>อัปเดตความคืบหน้าของโครงการแบบตรงไปตรงมา<br />ให้ทุกคนติดตามได้เสมอ</p></div></div>{project.updates.length ? <div className={styles.updates}>{project.updates.map((update) => <article key={update.id}><time dateTime={update.date}>{new Date(`${update.date}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}</time><h3>{update.title}</h3><p>{update.body}</p></article>)}</div> : <div className={styles.emptyRecord}><GiPencil aria-hidden="true" /><h3>รออัปเดตจากผู้จัดโครงการ</h3><p>เราจะมาอัปเดตความคืบหน้าให้ทุกคนได้เห็นที่นี่<br />เมื่อมีข้อมูลใหม่ ๆ</p></div>}</div><div data-project-reveal><div className={styles.recordHeading}><GiScrollUnfurled aria-hidden="true" /><div><h2>ข้อมูลที่เราจะเปิดเผย</h2><p>เพื่อให้ทุกคนมั่นใจและติดตามได้อย่างโปร่งใส<br />เราจะเปิดเผยข้อมูลสำคัญของโครงการ ดังนี้</p></div></div><ul className={styles.transparency}>{project.transparencyNotes.map((note, index) => <li key={`${index}-${note}`}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><p>{note}</p></li>)}</ul></div></section>
      {project.galleryImages.length > 0 && <section className={styles.gallery} aria-labelledby="project-gallery"><h2 id="project-gallery" className={styles.sectionHeading}>ภาพจากบันทึกโครงการ</h2><div>{project.galleryImages.map((image) => <figure key={image.url}><Image src={image.url} alt={image.alt} width={image.width} height={image.height} unoptimized /><figcaption>{image.kind === "CONCEPT" ? "ภาพแนวคิด · ไม่ใช่ภาพสถานที่จริง" : image.kind === "REFERENCE" ? "ภาพอ้างอิง" : "ภาพถ่าย"}{image.caption ? ` · ${image.caption}` : ""}</figcaption></figure>)}</div></section>}
    </main>
    <footer className={styles.footer}><Link href="/adventure" className={styles.brand}><GiCompass aria-hidden="true" /><span>Me Guild<small>พื้นที่ของคนที่รักเรื่องเดียวกัน</small></span></Link><p>✧ &nbsp; เรื่องราวดี ๆ เกิดขึ้นได้ เมื่อเราเดินไปด้วยกัน &nbsp; ✧</p><div><button type="button" className={styles.motionButton} aria-pressed={motion} onClick={() => setMotion((value) => !value)}>{motion ? "ปิดการเคลื่อนไหว" : "เปิดการเคลื่อนไหว"}</button><Link href="/adventure">‹ &nbsp; กลับหอชุมชน</Link></div></footer>
  </div>;
}
