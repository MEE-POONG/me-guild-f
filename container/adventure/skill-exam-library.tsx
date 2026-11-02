"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GiCompass, GiOpenBook } from "react-icons/gi";
import type { RealLifeSkillPublicNode } from "@/lib/real-life-skills-types";
import { SkillExamGuide } from "./skill-exam-guide";
import page from "./real-life-skills.module.css";
import styles from "./skill-exam-library.module.css";

type Library = { kind: "STARTER_LIBRARY"; packVersion: string; professionCount: number; skillCount: number; nodes: RealLifeSkillPublicNode[] };
type LibraryState = { kind: "loading" } | { kind: "error" } | { kind: "ready"; data: Library };
const number = (value: number) => value.toLocaleString("th-TH");
function isLibrary(value: unknown): value is Library {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<Library>;
  return data.kind === "STARTER_LIBRARY" && typeof data.packVersion === "string" && Number.isSafeInteger(data.professionCount) && Number.isSafeInteger(data.skillCount) && Array.isArray(data.nodes);
}

export function SkillExamLibrary() {
  const [state, setState] = useState<LibraryState>({ kind: "loading" });
  const [reload, setReload] = useState(0);
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState("");
  const [focusedSkill, setFocusedSkill] = useState({ id: "", version: 0 });
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), 15_000);
    fetch("/api/adventure/skills/library", { credentials: "omit", cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("LIBRARY_UNAVAILABLE");
        const data: unknown = await response.json();
        if (!isLibrary(data)) throw new Error("LIBRARY_INVALID");
        if (!controller.signal.aborted) setState({ kind: "ready", data });
      })
      .catch(() => { if (!controller.signal.aborted || controller.signal.reason === "timeout") setState({ kind: "error" }); })
      .finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [reload]);
  const data = state.kind === "ready" ? state.data : null;
  const catalog = useMemo(() => {
    const nodes = data?.nodes ?? [];
    const root = nodes.find(node => node.kind === "CATEGORY" && node.parentId === null && node.name === "ทักษะอาชีพ");
    const groups = root ? nodes.filter(node => node.kind === "CATEGORY" && node.parentId === root.id) : [];
    const groupIds = new Set(groups.map(node => node.id));
    const professions = nodes.filter(node => node.kind === "CATEGORY" && node.parentId && groupIds.has(node.parentId));
    const leaves = nodes.filter(node => node.kind === "SKILL");
    const children = new Map<string, RealLifeSkillPublicNode[]>();
    for (const leaf of leaves) { if (!leaf.parentId) continue; const entries = children.get(leaf.parentId) ?? []; entries.push(leaf); children.set(leaf.parentId, entries); }
    return { groups, professions, children, examCount: leaves.reduce((total, node) => total + (node.exams?.length ?? 0), 0) };
  }, [data]);
  const search = query.trim().toLocaleLowerCase("th");
  const professions = catalog.professions.filter(profession => (!groupId || profession.parentId === groupId) && (!search || `${profession.name} ${profession.description} ${(catalog.children.get(profession.id) ?? []).map(node => node.name).join(" ")}`.toLocaleLowerCase("th").includes(search)));
  const refresh = () => { setState({ kind: "loading" }); setReload(value => value + 1); };

  return <main className={page.page}>
    <a href="#library-content" className={page.skip}>ข้ามไปยังคลังอาชีพ</a>
    <header className={page.masthead}><Link href="/adventure" className={page.brand}><GiCompass aria-hidden="true" /><span>Me Guild<small>สมาคมนักผจญภัย</small></span></Link><nav aria-label="เส้นทางคลังทักษะ"><Link href="/adventure/skills">ทักษะของฉัน</Link><Link href="/adventure">ศูนย์บัญชาการ</Link></nav></header>
    <div className={page.content} id="library-content">
      <section className={page.heading}><div><p className={page.eyebrow}>PROFESSION & PRACTICAL EXAM LIBRARY</p><h1>คลังอาชีพและบททดสอบ</h1><p>สำรวจสิ่งที่อยากทำ เลือกทักษะ แล้วเตรียมผลงานสำหรับการประเมินแต่ละระดับ</p></div></section>
      <div className={styles.source}><GiOpenBook aria-hidden="true" /><p><strong>คลังเกณฑ์ตั้งต้น</strong> · โปรไฟล์จริงใช้ข้อมูลที่ทีมงานกำหนด หน้านี้เปิดอ่านได้โดยไม่เข้าสู่ระบบ และไม่แสดงคะแนนหรือผลสอบของสมาชิก</p></div>
      {state.kind === "loading" ? <section className={page.gate} role="status"><GiCompass aria-hidden="true" /><h2>กำลังเปิดคลังอาชีพ…</h2><p>เตรียมหมวดทักษะและโจทย์ปฏิบัติให้เลือกอ่าน</p></section> : null}
      {state.kind === "error" ? <section className={page.gate}><GiOpenBook aria-hidden="true" /><h2>คลังยังไม่พร้อมในขณะนี้</h2><p role="alert">ยังโหลดคลังอาชีพไม่ได้ กรุณาลองใหม่อีกครั้ง</p><button type="button" className={page.primary} onClick={refresh}>ลองเปิดคลังอีกครั้ง</button></section> : null}
      {data ? <>
        <section className={styles.overview} aria-label="จำนวนข้อมูลในคลัง"><div><strong>{number(data.professionCount)}</strong><span>อาชีพใน {number(catalog.groups.length)} กลุ่มงาน</span></div><div><strong>{number(data.skillCount)}</strong><span>ทักษะย่อยรวมทักษะชีวิตเดิม</span></div><div><strong>{number(catalog.examCount)}</strong><span>บททดสอบปฏิบัติ G–SS</span></div></section>
        <div className={styles.jump}><p>เริ่มจากอาชีพที่สนใจ หรือเปิดข้อสอบเครื่องดนตรี อาหาร และทักษะชีวิตในคลังเดียวกัน</p><a href="#skill-exam-guide-heading" className={page.secondary}>เปิดข้อสอบปฏิบัติทั้งหมด ↓</a></div>
        <section className={styles.professions} aria-labelledby="library-professions-heading"><div className={page.sectionHeading}><div><p className={page.eyebrow}>EXPLORE PROFESSIONS</p><h2 id="library-professions-heading">เลือกอาชีพที่อยากฝึก</h2></div><span>หมวดความสามารถจากผลงาน</span></div>
          <div className={styles.filters}><label>ค้นหาอาชีพในคลัง<input type="search" maxLength={120} value={query} placeholder="นักพัฒนา บาริสต้า ช่างภาพ หรือชื่อทักษะ…" onChange={event => setQuery(event.target.value)} /></label><label>กลุ่มอาชีพ<select value={groupId} onChange={event => setGroupId(event.target.value)}><option value="">ทุกกลุ่มงาน</option>{catalog.groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label></div>
          <p className={styles.count} role="status">แสดง {number(professions.length)} จาก {number(catalog.professions.length)} อาชีพ · เลือกทักษะเพื่อเปิดโจทย์ของทักษะนั้น</p>
          {professions.length ? <div className={styles.grid}>{professions.map(profession => <article className={styles.profession} key={profession.id}><small>{catalog.groups.find(group => group.id === profession.parentId)?.name}</small><h3>{profession.name}</h3><p>{profession.description}</p><ul>{(catalog.children.get(profession.id) ?? []).map(skill => <li key={skill.id}><a href="#skill-exam-guide-heading" onClick={() => setFocusedSkill(current => ({ id: skill.id, version: current.version + 1 }))}><span>{skill.name}</span><small>เต็ม {number(skill.maxLevel ?? 0)} · 9 ระดับ <b aria-hidden="true">↗</b></small></a></li>)}</ul></article>)}</div> : <div className={styles.empty}><p>ไม่พบอาชีพที่ตรงกับคำค้น</p><button type="button" className={page.secondary} onClick={() => { setQuery(""); setGroupId(""); }}>ล้างตัวกรองอาชีพ</button></div>}
        </section>
        <SkillExamGuide key={`${focusedSkill.id}:${focusedSkill.version}`} nodes={data.nodes} initialSkillId={focusedSkill.id} libraryMode />
        <p className={styles.footnote}>รุ่นคลัง {data.packVersion} · ชื่ออาชีพเป็นบริบทของทักษะ ไม่ใช่การมอบตำแหน่งงาน ใบอนุญาต หรือสิทธิ์เข้าถึงระบบ</p>
      </> : null}
      <footer className={page.footer}><span aria-hidden="true">✦</span> Me Guild · ฝึกจากโจทย์ เติบโตจากผลงาน</footer>
    </div>
  </main>;
}
