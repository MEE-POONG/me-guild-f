"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { animate, createScope } from "animejs";
import Tilt from "react-parallax-tilt";
import { GiCompass, GiLaurels, GiOpenBook, GiPadlock, GiSparkles } from "react-icons/gi";
import type { RealLifeSkillGrade, RealLifeSkillPublicNode } from "@/lib/real-life-skills-types";
import { REAL_LIFE_GRADE_DIFFICULTY } from "@/lib/real-life-skills-types";
import { useRealLifeSkills } from "./use-real-life-skills";
import { SkillExamGuide, SkillExamResultSummary } from "./skill-exam-guide";
import styles from "./real-life-skills.module.css";

const numberFormat = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
const grades: RealLifeSkillGrade[] = ["SS", "S", "A", "B", "C", "D", "E", "F", "G"];
const motionQuery = "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function readMotion() { return window.matchMedia(motionQuery).matches; }
function serverMotion() { return false; }
function format(value: number) { return numberFormat.format(value); }
function time(value: string | null) {
  const parsed = value ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? dateFormat.format(parsed) : "ยังไม่มีผลประเมิน";
}
function evidenceLink(value: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
function SkillBranch({ node, childrenByParent, visible }: { node: RealLifeSkillPublicNode; childrenByParent: Map<string | null, RealLifeSkillPublicNode[]>; visible: Set<string> }) {
  if (!visible.has(node.id)) return null;
  if (node.kind === "SKILL") return <li className={styles.skill}>
    <div className={styles.skillTop}><div><h4>{node.name}</h4>{node.description ? <p>{node.description}</p> : null}</div><span className={styles.grade} data-grade={node.grade} aria-label={`คลาส ${node.grade}`}>{node.grade}</span></div>
    <div className={styles.score}><span><strong>{format(node.earnedLevel)}</strong> / {format(node.maxLevel ?? 0)} Lv</span><span>{format(node.percent)}%</span></div>
    <progress value={node.percent} max={100} aria-label={`ทักษะ ${node.name} ${format(node.percent)} เปอร์เซ็นต์`} />
    <p className={styles.assessment} data-assessed={node.assessed}>{node.assessed ? <>ประเมินแล้ว · <time dateTime={node.assessedAt ?? undefined}>{time(node.assessedAt)}</time></> : "รอทีมงานประเมิน · นับเป็น 0 Lv"}</p>
    {node.scoreGrade && node.scoreGrade !== node.grade ? <p className={styles.assessment}>คลาสจากคะแนน {node.scoreGrade} · คลาสที่แสดง {node.grade}</p> : null}
    {node.exams?.length ? <p className={styles.assessment}>{node.passedExams?.length ? `ผลสอบรับรองสูงสุด ${node.verifiedGrade ?? "G"}` : "ยังไม่มีผลสอบรับรอง"}{node.nextExamGrade ? ` · ด่านถัดไป ${node.nextExamGrade}` : node.nextExamGrade === null ? " · ผ่านครบทุกระดับ" : ""}</p> : null}
  </li>;
  const children = childrenByParent.get(node.id) ?? [];
  return <li className={styles.branch}>
    <details open>
      <summary><span className={styles.branchName}>{node.name}<small>{format(node.earnedLevel)} / {format(node.maxLevel ?? 0)} Lv · {format(node.percent)}%</small></span><span className={styles.grade} data-grade={node.grade} aria-label={`คลาสหมวด ${node.grade}`}>{node.grade}</span></summary>
      {node.description ? <p className={styles.branchDescription}>{node.description}</p> : null}
      <ul>{children.map((child) => <SkillBranch key={child.id} node={child} childrenByParent={childrenByParent} visible={visible} />)}</ul>
    </details>
  </li>;
}

export function RealLifeSkills() {
  const { state, refresh } = useRealLifeSkills();
  const [search, setSearch] = useState("");
  const [rootId, setRootId] = useState("");
  const [grade, setGrade] = useState("");
  const [motionEnabled, setMotionEnabled] = useState(true);
  const root = useRef<HTMLElement>(null);
  const canAnimate = useSyncExternalStore(subscribeMotion, readMotion, serverMotion) && motionEnabled;
  const snapshot = state.kind === "ready" ? state.snapshot : null;

  useEffect(() => {
    if (!root.current || !canAnimate) return;
    const scope = createScope({ root }).add(() => { animate("[data-skill-reveal]", { opacity: [0, 1], y: [12, 0], duration: 650, ease: "outExpo" }); });
    return () => scope.revert();
  }, [canAnimate, state.kind]);

  const tree = useMemo(() => {
    const nodes = snapshot?.nodes ?? [];
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const childrenByParent = new Map<string | null, RealLifeSkillPublicNode[]>();
    for (const node of nodes) { const entries = childrenByParent.get(node.parentId) ?? []; entries.push(node); childrenByParent.set(node.parentId, entries); }
    for (const entries of childrenByParent.values()) entries.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "th"));
    const query = search.trim().toLocaleLowerCase("th");
    const visible = new Set<string>();
    let matchedCount = 0;
    for (const node of nodes) {
      if (node.kind !== "SKILL" || grade && node.grade !== grade) continue;
      const ancestors: RealLifeSkillPublicNode[] = [];
      const seen = new Set<string>();
      let current: RealLifeSkillPublicNode | undefined = node;
      while (current && !seen.has(current.id)) { ancestors.push(current); seen.add(current.id); current = current.parentId ? byId.get(current.parentId) : undefined; }
      if (rootId && !ancestors.some((ancestor) => ancestor.id === rootId)) continue;
      if (query && !ancestors.some((ancestor) => `${ancestor.name} ${ancestor.description}`.toLocaleLowerCase("th").includes(query))) continue;
      matchedCount++;
      for (const ancestor of ancestors) visible.add(ancestor.id);
    }
    return { childrenByParent, roots: childrenByParent.get(null) ?? [], visible, matchedCount };
  }, [snapshot, search, grade, rootId]);

  return <main className={styles.page} ref={root}>
    <a href="#skill-content" className={styles.skip}>ข้ามไปยังบันทึกทักษะ</a>
    <header className={styles.masthead}><Link href="/adventure" className={styles.brand}><GiCompass aria-hidden="true" /><span>Me Guild<small>สมาคมนักผจญภัย</small></span></Link><nav aria-label="เส้นทางบันทึก"><Link href="/adventure/skills/library">คลังอาชีพและบททดสอบ</Link><Link href="/adventure">ศูนย์บัญชาการ</Link><Link href="/adventure/login">บัญชี Discord</Link></nav></header>
    <div className={styles.content} id="skill-content">
      <section className={styles.heading} data-skill-reveal><div><p className={styles.eyebrow}>REAL LIFE SKILLS</p><h1>ทักษะในชีวิตจริง</h1><p>ทุกสิ่งที่เรียนรู้ คืออีกก้าวของการเติบโต</p></div><button type="button" className={styles.motion} onClick={() => setMotionEnabled((value) => !value)} aria-pressed={motionEnabled}>เอฟเฟกต์ {motionEnabled ? "เปิด" : "ปิด"}</button></section>
      <p className={styles.sourceNote}><GiOpenBook aria-hidden="true" />บันทึกส่วนตัว · คะแนนและคลาสอัปเดตจากผลประเมินของทีมงาน</p>

      {state.kind === "loading" ? <section className={styles.gate} role="status"><GiCompass aria-hidden="true" /><h2>กำลังเปิดบันทึกทักษะ…</h2><p>ตรวจสอบบัญชีสมาชิกและผลประเมินล่าสุด</p></section> : null}
      {state.kind === "anonymous" ? <section className={styles.gate}><GiPadlock aria-hidden="true" /><h2>เปิดบันทึกของคุณ</h2><p>เข้าสู่ระบบสมาชิกด้วย Discord เพื่อดู Lv คลาส และทักษะในชีวิตจริงที่ทีมงานประเมินให้คุณ</p><Link href="/adventure/login?returnTo=%2Fadventure%2Fskills" className={styles.primary}>เข้าสู่ระบบด้วย Discord</Link></section> : null}
      {state.kind === "error" ? <section className={styles.gate}><GiOpenBook aria-hidden="true" /><h2>บันทึกยังไม่พร้อม</h2><p role="alert">{state.message}</p><button type="button" className={styles.primary} onClick={refresh}>ลองเปิดบันทึกอีกครั้ง</button></section> : null}

      {snapshot ? <>
        <Tilt tiltEnable={canAnimate} glareEnable={canAnimate} glareMaxOpacity={0.08} tiltMaxAngleX={2} tiltMaxAngleY={2} className={styles.tilt}>
          <section className={styles.summary} data-skill-reveal aria-labelledby="skill-level-heading">
            <div className={styles.levelSeal}><GiLaurels aria-hidden="true" /><span><small>LV.</small><strong>{format(snapshot.level)}</strong></span></div>
            <div className={styles.summaryBody}><p className={styles.eyebrow}>บันทึกการเติบโตของฉัน</p><h2 id="skill-level-heading">Lv {format(snapshot.level)} <span>/ 999</span></h2><p>รวมทักษะที่ประเมินแล้ว <b>{format(snapshot.totalEarned)}</b> / {format(snapshot.totalPossible)} Lv</p><progress value={snapshot.percent} max={100} aria-label={`ความสามารถรวม ${format(snapshot.percent)} เปอร์เซ็นต์`} /><div className={styles.summaryFoot}><span>{format(snapshot.percent)}% ของเพดานทักษะทั้งหมด</span><span>{format(snapshot.assessedCount)} / {format(snapshot.skillCount)} ทักษะผ่านการประเมิน</span></div></div>
            <div className={styles.classSeal}><small>คลาสรวม</small><strong>{snapshot.grade}</strong><span>REAL LIFE CLASS</span></div>
          </section>
        </Tilt>
        <div className={styles.notice}><GiSparkles aria-hidden="true" /><p>Lv รวมคำนวณจากทักษะย่อยปลายกิ่งเพียงครั้งเดียว หมวดใหญ่แสดงผลรวมจากทักษะข้างใน ทักษะที่ยังไม่ประเมินนับเป็น 0 Lv</p></div>
        <p><a className={styles.secondary} href="#skill-exam-guide-heading">ข้ามไปดูข้อสอบปฏิบัติ G–SS ↓</a></p>

        {snapshot.skillCount === 0 ? <section className={styles.gate}><GiOpenBook aria-hidden="true" /><h2>สมุดทักษะกำลังเริ่มต้น</h2><p>ทีมงานยังไม่ได้เปิดรายการทักษะ เมื่อกำหนดหมวดและทักษะย่อยแล้ว รายการจะปรากฏที่นี่</p><button type="button" className={styles.secondary} onClick={refresh}>ตรวจข้อมูลอีกครั้ง</button></section> : <section className={styles.catalog} aria-labelledby="skill-catalog-heading">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>SKILL JOURNAL</p><h2 id="skill-catalog-heading">แผนผังความสามารถ</h2></div><button type="button" className={styles.secondary} onClick={refresh}>อัปเดตข้อมูล</button></div>
          <div className={styles.filters}><label>ค้นหาทักษะ<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="กีตาร์ อาหารไทย หรือชื่อทักษะ…" /></label><label>หมวดหลัก<select value={rootId} onChange={(event) => setRootId(event.target.value)}><option value="">ทุกหมวด</option>{tree.roots.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}</select></label><label>คลาสทักษะย่อย<select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="">ทุกคลาส</option>{grades.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
          <p className={styles.resultCount} role="status">แสดง {format(tree.matchedCount)} จาก {format(snapshot.skillCount)} ทักษะย่อย · ตัวกรองไม่เปลี่ยนคะแนนรวม</p>
          {tree.matchedCount ? <ul className={styles.tree}>{tree.roots.map((node) => <SkillBranch key={node.id} node={node} childrenByParent={tree.childrenByParent} visible={tree.visible} />)}</ul> : <div className={styles.empty}><h3>ยังไม่พบทักษะที่ตรงกับตัวกรอง</h3><button type="button" className={styles.secondary} onClick={() => { setSearch(""); setRootId(""); setGrade(""); }}>ล้างตัวกรอง</button></div>}
        </section>}

        <SkillExamGuide nodes={snapshot.nodes} />

        <section className={styles.rules} aria-labelledby="skill-rules-heading"><div><p className={styles.eyebrow}>GRADING GUIDE</p><h2 id="skill-rules-heading">อ่าน Lv และคลาสอย่างไร</h2><p>แต่ละทักษะมีเพดานของตัวเอง คลาสจากคะแนนใช้เปอร์เซ็นต์ต่อเพดาน ส่วนผลสอบปฏิบัติยืนยันว่าทำตามเกณฑ์ของระดับนั้นได้จริง หมวดและบุคคลแสดงผลรวมคะแนนทักษะ</p></div><div className={styles.gradeScale}>{snapshot.rules.thresholds.map((threshold, index) => <div key={threshold.grade}><strong>{threshold.grade}</strong><span>{format(threshold.minPercent)}{index === 0 ? "–100" : `–<${format(snapshot.rules.thresholds[index - 1].minPercent)}`} %</span><small>{REAL_LIFE_GRADE_DIFFICULTY[threshold.grade]}</small></div>)}</div><p className={styles.formula}>Lv บุคคล = ปัดลง [999 × (Lv ทักษะย่อยรวม ÷ เพดานทักษะย่อยรวม)]</p><p className={styles.ruleFoot}>รายการทักษะ เพดาน และเกณฑ์คลาสปรับได้โดยทีมงาน เมื่อมีการปรับ รายการที่เปิดใช้งานและคะแนนรวมจะคำนวณใหม่ · เกณฑ์รุ่น {snapshot.rules.revision}</p></section>

        <section className={styles.history} aria-labelledby="skill-history-heading"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>ASSESSMENT RECORD</p><h2 id="skill-history-heading">บันทึกการประเมินล่าสุด</h2></div><span>เวลาไทย</span></div>{snapshot.history.length ? <ol>{snapshot.history.map((entry) => { const evidence = evidenceLink(entry.evidenceUrl); return <li key={entry.id}><div className={styles.historyHead}><strong>{entry.skillName}</strong><span>{format(entry.previousLevel)} <span aria-label="ปรับเป็น">→</span> {format(entry.level)} Lv</span></div><p>{entry.reason}</p>{entry.examResult ? <SkillExamResultSummary result={entry.examResult} /> : null}<div className={styles.historyFoot}><time dateTime={entry.assessedAt}>{time(entry.assessedAt)}</time>{evidence ? <a href={evidence} target="_blank" rel="noreferrer noopener">ดูหลักฐาน ↗</a> : null}</div></li>; })}</ol> : <p className={styles.emptyHistory}>ยังไม่มีประวัติการประเมิน ทีมงานจะบันทึกเหตุผลเมื่ออัปเดตทักษะให้คุณ</p>}</section>
      </> : null}
      <footer className={styles.footer}><span aria-hidden="true">✦</span> Me Guild · เติบโตจากสิ่งที่ลงมือทำ</footer>
    </div>
  </main>;
}
