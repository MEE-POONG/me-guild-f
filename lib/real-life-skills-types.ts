/** Public response contract. Scores and grades are calculated by the owning backend. */
export type RealLifeSkillGrade = "SS" | "S" | "A" | "B" | "C" | "D" | "E" | "F" | "G";
export const REAL_LIFE_GRADE_DIFFICULTY: Record<RealLifeSkillGrade, string> = {
  SS: "สูงสุด", S: "ยากมาก", A: "ยาก", B: "ค่อนข้างยาก", C: "ปานกลาง",
  D: "ง่าย", E: "ง่ายมาก", F: "เริ่มต้น", G: "ต่ำสุด",
};
export type RealLifeSkillExam = {
  grade: RealLifeSkillGrade;
  title: string;
  objective: string;
  criteria: { id: string; text: string }[];
  evidence: string;
  requiredSamples: number;
  sampleLabels: string[];
  minDurationSeconds: number;
  minAccuracyPercent: number;
};
export type RealLifeSkillExamReceipt = {
  grade: RealLifeSkillGrade;
  examRevision: number;
  assessmentRevision: number;
  passedAt: string;
};
export type RealLifeSkillExamResult = {
  grade: RealLifeSkillGrade;
  examRevision: number;
  passed: boolean;
  performancePercent: number;
  criteriaPassed: string[];
  samples: { name: string; durationSeconds: number }[];
  questResults?: { questId: string; completedAt: string; evidence: string }[];
};
export type RealLifeSkillAdvancement = {
  grade: RealLifeSkillGrade;
  method: "EXAM" | "EXAM_AND_QUEST_CHAIN";
  prerequisiteGrade: RealLifeSkillGrade | null;
  requiresReview: true;
  quests: { id: string; order: number; title: string; objective: string; evidence: string }[];
};
export type RealLifeSkillPublicNode = {
  id: string;
  parentId: string | null;
  kind: "CATEGORY" | "SKILL";
  name: string;
  description: string;
  maxLevel: number | null;
  isActive: boolean;
  sortOrder: number;
  revision: number;
  earnedLevel: number;
  percent: number;
  grade: RealLifeSkillGrade;
  assessed: boolean;
  assessmentRevision: number;
  assessedAt: string | null;
  exams?: RealLifeSkillExam[] | null;
  examRevision?: number;
  scoreGrade?: RealLifeSkillGrade;
  verifiedGrade?: RealLifeSkillGrade;
  passedExams?: RealLifeSkillExamReceipt[];
  nextExamGrade?: RealLifeSkillGrade | null;
  advancement?: RealLifeSkillAdvancement[];
};
export type RealLifeSkillSnapshot = {
  level: number;
  maxLevel: 999;
  totalEarned: number;
  totalPossible: number;
  percent: number;
  grade: RealLifeSkillGrade;
  assessedCount: number;
  skillCount: number;
  nodes: RealLifeSkillPublicNode[];
  rules: { revision: number; thresholds: { grade: RealLifeSkillGrade; minPercent: number }[] };
  history: { id: string; skillId: string; skillName: string; previousLevel: number; level: number; reason: string; evidenceUrl: string | null; assessedAt: string; examResult?: RealLifeSkillExamResult | null }[];
};
