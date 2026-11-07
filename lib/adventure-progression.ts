/** Locked community-v1 rules. This module is safe to share with the explicitly labelled UI demo. */
export const COMMUNITY_PROGRESSION_RULE_VERSION = "community-v1" as const;
export const COMMUNITY_MAX_LEVEL = 50;
export const COMMUNITY_PARTICIPATION_XP = 50;
export const COMMUNITY_APPROVED_XP = 150;

export type CommunityProgressionCredit = {
  campaignId: string;
  campaignTitle: string;
  xp: 50 | 150;
  earnedAt: string;
  source: "participation" | "staff";
};

export type CommunityProgressionSnapshot = {
  ruleVersion: typeof COMMUNITY_PROGRESSION_RULE_VERSION;
  totalXp: number;
  level: number;
  rank: { level: number; title: string };
  levelStartXp: number;
  nextLevelXp: number | null;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  xpRemaining: number;
  progressPercent: number;
  isMaxLevel: boolean;
  milestones: { level: number; title: string; totalXp: number; reached: boolean }[];
  metrics: { participatedEvents: number; approvedEvents: number; earnedAchievements: number };
  recentCredits: CommunityProgressionCredit[];
};

export const COMMUNITY_RANKS = [
  { level: 1, title: "นักผจญภัยฝึกหัด" },
  { level: 5, title: "นักสำรวจ" },
  { level: 10, title: "นักผจญภัย" },
  { level: 20, title: "ผู้ร่วมสร้าง" },
  { level: 35, title: "ผู้จารึกเรื่องราว" },
  { level: 50, title: "ตำนานแห่ง Me Guild" },
] as const;

export function progressionLevelThreshold(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > COMMUNITY_MAX_LEVEL) throw new RangeError("Invalid community level");
  return 25 * (level - 1) * (level + 2);
}

/** Credits describe a campaign's total contribution, not a replayable XP increment. */
export function buildCommunityProgressionSnapshot(input: { credits: readonly CommunityProgressionCredit[]; earnedAchievements: number }): CommunityProgressionSnapshot {
  if (!Array.isArray(input.credits) || !Number.isSafeInteger(input.earnedAchievements) || input.earnedAchievements < 0 || input.earnedAchievements < input.credits.length) throw new RangeError("Invalid community history");
  const campaigns = new Map<string, CommunityProgressionCredit>();
  for (const credit of input.credits) {
    if (!credit || typeof credit !== "object") throw new RangeError("Invalid community credit");
    const expectedXp = credit.source === "staff" ? COMMUNITY_APPROVED_XP : credit.source === "participation" ? COMMUNITY_PARTICIPATION_XP : null;
    if (typeof credit.campaignId !== "string" || !credit.campaignId || credit.campaignId.length > 128 || typeof credit.campaignTitle !== "string" || !credit.campaignTitle.trim() || credit.campaignTitle.length > 240 || credit.xp !== expectedXp || typeof credit.earnedAt !== "string" || !Number.isFinite(Date.parse(credit.earnedAt))) throw new RangeError("Invalid community credit");
    const previous = campaigns.get(credit.campaignId);
    // Several badges for one event cannot stack. Same-score duplicates retain the first earned date.
    if (!previous || credit.xp > previous.xp || (credit.xp === previous.xp && Date.parse(credit.earnedAt) < Date.parse(previous.earnedAt))) campaigns.set(credit.campaignId, { ...credit });
  }
  const credits = [...campaigns.values()];
  const totalXp = credits.reduce((total, credit) => total + credit.xp, 0);
  if (!Number.isSafeInteger(totalXp)) throw new RangeError("Community XP exceeds supported precision");
  let level = 1;
  while (level < COMMUNITY_MAX_LEVEL && totalXp >= progressionLevelThreshold(level + 1)) level++;
  const isMaxLevel = level === COMMUNITY_MAX_LEVEL;
  const levelStartXp = progressionLevelThreshold(level);
  const nextLevelXp = isMaxLevel ? null : progressionLevelThreshold(level + 1);
  const xpForNextLevel = nextLevelXp === null ? null : nextLevelXp - levelStartXp;
  const xpIntoLevel = totalXp - levelStartXp;
  const rank = [...COMMUNITY_RANKS].reverse().find((milestone) => milestone.level <= level)!;
  return {
    ruleVersion: COMMUNITY_PROGRESSION_RULE_VERSION,
    totalXp, level, rank: { ...rank }, levelStartXp, nextLevelXp, xpIntoLevel, xpForNextLevel,
    xpRemaining: nextLevelXp === null ? 0 : nextLevelXp - totalXp,
    progressPercent: xpForNextLevel === null ? 100 : Math.min(100, Math.max(0, Math.round(xpIntoLevel / xpForNextLevel * 10000) / 100)),
    isMaxLevel,
    milestones: COMMUNITY_RANKS.map((milestone) => ({ ...milestone, totalXp: progressionLevelThreshold(milestone.level), reached: level >= milestone.level })),
    metrics: { participatedEvents: campaigns.size, approvedEvents: credits.filter((credit) => credit.source === "staff").length, earnedAchievements: input.earnedAchievements },
    recentCredits: credits.sort((left, right) => Date.parse(right.earnedAt) - Date.parse(left.earnedAt) || left.campaignId.localeCompare(right.campaignId)).slice(0, 8),
  };
}
