"use client";

import { useMemo, useState } from "react";
import { REAL_LIFE_GRADE_DIFFICULTY, type RealLifeSkillExamResult, type RealLifeSkillGrade, type RealLifeSkillPublicNode } from "@/lib/real-life-skills-types";
import styles from "./skill-exam-guide.module.css";

const order: RealLifeSkillGrade[] = ["G", "F", "E", "D", "C", "B", "A", "S", "SS"];
const numbers = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const dates = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });
const number = (value: number) => numbers.format(value);

function skillPath(node: RealLifeSkillPublicNode, nodes: Map<string, RealLifeSkillPublicNode>): string {
  const names = [node.name];
  const seen = new Set([node.id]);
  let parent = node.parentId ? nodes.get(node.parentId) : undefined;
  while (parent && !seen.has(parent.id)) {
    names.unshift(parent.name); seen.add(parent.id);
    parent = parent.parentId ? nodes.get(parent.parentId) : undefined;
  }
  return names.join(" › ");
}

function examDate(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? dates.format(parsed) : "มีผลสอบบันทึกแล้ว";
}

export function SkillExamGuide({ nodes, initialSkillId = "", libraryMode = false }: { nodes: RealLifeSkillPublicNode[]; initialSkillId?: string; libraryMode?: boolean }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialSkillId);
  const skills = useMemo(() => {
    const byId = new Map(nodes.map(node => [node.id, node]));
    return nodes.filter(node => node.kind === "SKILL").map(node => ({ node, path: skillPath(node, byId) }));
  }, [nodes]);
  const search = query.trim().toLocaleLowerCase("th");
  const matching = skills.filter(skill => !search || skill.path.toLocaleLowerCase("th").includes(search));
  const selected = matching.find(skill => skill.node.id === selectedId) ?? matching.find(skill => skill.node.name === "กีตาร์") ?? matching[0];
  const node = selected?.node;
  const exams = [...(node?.exams ?? [])].sort((a, b) => order.indexOf(a.grade) - order.indexOf(b.grade));
  const passed = libraryMode ? [] : (node?.passedExams ?? []).filter(receipt => receipt.examRevision === (node?.examRevision ?? 1));
  const passedGrades = new Set(passed.map(receipt => receipt.grade));

  return <section className={styles.guide} aria-labelledby="skill-exam-guide-heading">
    <div className={styles.heading}><div><h2 id="skill-exam-guide-heading" tabIndex={-1}>ข้อสอบและเควสเลื่อนขั้น</h2><p>เลือกทักษะเพื่อดูเงื่อนไขแต่ละระดับ ทักษะที่กำหนดเควสต้องทำตามลำดับและส่งหลักฐานครบก่อนให้ทีมงานรับรองผล</p></div><span className={styles.seal} aria-hidden="true">G → SS</span></div>
    <div className={styles.filters}>
      <label>ค้นหาทักษะหรืออาชีพสำหรับดูข้อสอบ<input type="search" value={query} maxLength={120} placeholder="กีตาร์ นักพัฒนาซอฟต์แวร์ หรือชื่อทักษะ…" onChange={event => setQuery(event.target.value)} /></label>
      <label>ทักษะที่ต้องการดูข้อสอบ<select value={node?.id ?? ""} disabled={!matching.length} onChange={event => setSelectedId(event.target.value)}>{matching.length ? matching.map(skill => <option key={skill.node.id} value={skill.node.id}>{skill.path}</option>) : <option value="">ไม่พบทักษะที่ตรงกับคำค้น</option>}</select></label>
    </div>
    <p className={styles.matchCount} role="status">พบ {number(matching.length)} จาก {number(skills.length)} ทักษะ · แสดงข้อสอบเฉพาะทักษะที่เลือก</p>
    {node ? <>
      <div className={styles.skillHeading}><div><p>{selected?.path ?? node.name}</p><h3>{node.name}</h3></div><span>เกณฑ์ข้อสอบรุ่น {number(node.examRevision ?? 1)}</span></div>
      {!libraryMode ? <div className={styles.statuses}>
        <div><span>คลาสจากคะแนน</span><strong>{node.scoreGrade ?? node.grade}</strong></div>
        <div><span>ผลสอบที่รับรองสูงสุด</span><strong>{passed.length ? node.verifiedGrade ?? "G" : "ยังไม่มีผลสอบ"}</strong></div>
        <div><span>ด่านถัดไป</span><strong>{node.nextExamGrade === null ? "ครบทุกระดับ" : node.nextExamGrade ?? "รอทีมงานตรวจ"}</strong></div>
      </div> : null}
      <p className={styles.note}>{libraryMode ? "คลังนี้แสดงเกณฑ์ตั้งต้นสำหรับเตรียมฝึก ไม่ใช่คะแนน ผลสอบ หรือคลาสของสมาชิก โปรไฟล์จริงใช้เกณฑ์ที่ทีมงานกำหนดในระบบ" : "คะแนนทักษะใช้กำหนดช่วงคลาส ส่วนข้อสอบใช้ยืนยันว่าทำงานของระดับนั้นได้จริง ผลที่เห็นเป็นบันทึกจากทีมงาน การเปิดอ่านโจทย์ไม่เพิ่มคะแนนหรือมอบผลสอบ"}</p>
      {exams.length ? <div className={styles.exams}>{exams.map(exam => {
        const receipt = passed.find(value => value.grade === exam.grade);
        const isNext = !libraryMode && node.nextExamGrade === exam.grade;
        const advancement = node.advancement?.find(value => value.grade === exam.grade);
        const quests = [...(advancement?.quests ?? [])].sort((a, b) => a.order - b.order);
        const requiresQuests = advancement?.method === "EXAM_AND_QUEST_CHAIN";
        return <details key={`${node.id}:${node.examRevision ?? 1}:${exam.grade}`} className={styles.exam} open={isNext || libraryMode && exam.grade === "F"} data-passed={passedGrades.has(exam.grade)}>
          <summary><span className={styles.grade}>{exam.grade}</span><span className={styles.examTitle}><strong>{exam.title}</strong><small>{REAL_LIFE_GRADE_DIFFICULTY[exam.grade]} · {requiresQuests ? "ต้องสอบ + เควสต่อเนื่อง" : "ต้องสอบปฏิบัติ"} · ผลงานอย่างน้อย {number(exam.requiredSamples)} รายการ</small></span><span className={styles.badge} data-passed={Boolean(receipt)}>{receipt ? "ผลสอบผ่าน" : isNext ? "ด่านถัดไป" : "ดูเงื่อนไข"}</span></summary>
          <div className={styles.examBody}>
            <div className={styles.advancement}>
              <h4>เงื่อนไขเลื่อนขั้นเป็น {exam.grade}</h4>
              <p><strong>{requiresQuests ? `ผ่านข้อสอบปฏิบัติและเควสต่อเนื่อง ${number(quests.length)} ขั้น` : "ผ่านข้อสอบปฏิบัติ"}</strong>{advancement?.prerequisiteGrade ? ` · ต้องผ่านระดับ ${advancement.prerequisiteGrade} ก่อน` : advancement ? " · เริ่มฝึกจากระดับนี้ได้" : ""}</p>
              <p>ทีมงานตรวจผลงานและบันทึกผลตามเกณฑ์ของระดับนี้</p>
            </div>
            <p className={styles.objective}>{exam.objective}</p>
            <div className={styles.requirements}><span>จำนวนผลงาน <b>{number(exam.requiredSamples)} รายการขึ้นไป</b></span><span>คุณภาพจากรายการตรวจ <b>อย่างน้อย {number(exam.minAccuracyPercent)}%</b></span><span>ระยะเวลาต่อผลงาน <b>{exam.minDurationSeconds > 0 ? `อย่างน้อย ${number(exam.minDurationSeconds)} วินาที` : "ไม่กำหนดตายตัว"}</b></span></div>
            <h4>เกณฑ์ผ่านข้อสอบ {exam.grade}</h4>
            <ul className={styles.criteria} aria-label={`เกณฑ์ผ่านข้อสอบ ${exam.grade}`}>{exam.criteria.map(criterion => <li key={criterion.id}><span aria-hidden="true">{receipt ? "✓" : "□"}</span><span>{criterion.text}</span></li>)}</ul>
            <div className={styles.examples}><h4>ตัวอย่างโจทย์และผลงาน</h4><ol>{exam.sampleLabels.map((label, index) => <li key={`${index}:${label}`}>{label}</li>)}</ol></div>
            {requiresQuests && quests.length ? <section className={styles.questChain} aria-label={`เควสต่อเนื่องระดับ ${exam.grade}`}>
              <h4>เควสต่อเนื่องที่ต้องผ่านตามลำดับ</h4>
              <ol>{quests.map(quest => <li key={quest.id}><strong>{quest.title}</strong><p>{quest.objective}</p><p className={styles.questEvidence}><span>หลักฐาน:</span> {quest.evidence}</p></li>)}</ol>
              <p className={styles.questNote}>รายการนี้เป็นเงื่อนไขของระดับ ไม่ใช่สถานะการทำเควสของคุณ ทีมงานต้องตรวจหลักฐานแต่ละขั้นก่อนรับรองการเลื่อนขั้น</p>
            </section> : null}
            <div className={styles.evidence}><h4>หลักฐานที่ใช้ตรวจ</h4><p>{exam.evidence}</p></div>
            {receipt ? <p className={styles.passed}>ทีมงานบันทึกผลสอบผ่านระดับ {receipt.grade} · <time dateTime={receipt.passedAt}>{examDate(receipt.passedAt)}</time>{requiresQuests ? " · ตรวจหลักฐานเควสที่มีบันทึกในประวัติการประเมิน" : ""}</p> : null}
          </div>
        </details>;
      })}</div> : <div className={styles.empty}><p>ทักษะนี้ยังไม่มีรายละเอียดข้อสอบที่เปิดอ่านได้ ทีมงานจะเพิ่มเกณฑ์ผ่านหลังบ้าน</p></div>}
    </> : <div className={styles.empty}><p>ยังไม่พบทักษะที่ตรงกับคำค้น</p><button type="button" onClick={() => setQuery("")}>ล้างคำค้นข้อสอบ</button></div>}
  </section>;
}

export function SkillExamResultSummary({ result }: { result: RealLifeSkillExamResult }) {
  return <div className={styles.historyResult} data-passed={result.passed}>
    <p><strong>ข้อสอบ {result.grade} · {result.passed ? "ผ่าน" : "ยังไม่ผ่าน"}</strong><span>คุณภาพ {number(result.performancePercent)}% · ผ่าน {number(result.criteriaPassed.length)} รายการตรวจ</span></p>
    {result.samples.length ? <ul aria-label="ผลงานที่ใช้สอบ">{result.samples.map((sample, index) => <li key={`${index}:${sample.name}`}>{sample.name}{sample.durationSeconds > 0 ? ` · ${number(sample.durationSeconds)} วินาที` : ""}</li>)}</ul> : null}
    {result.questResults?.length ? <div className={styles.historyQuests}><h4>หลักฐานเควสที่ทีมงานบันทึก</h4><ol>{result.questResults.map((quest, index) => <li key={quest.questId}><strong>ขั้นที่ {number(index + 1)}</strong><p>{quest.evidence}</p><time dateTime={quest.completedAt}>{examDate(quest.completedAt)}</time></li>)}</ol></div> : null}
  </div>;
}
