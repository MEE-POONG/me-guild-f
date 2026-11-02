export type RafflePrizeKind = "ROLE" | "ITEM" | "BADGE";
export type RafflePrizeGroup = { kind: RafflePrizeKind; reference: string; label: string; quantity: number; winnerCount: number };
export type RaffleWebSettings = { version: 1; description: string; opensAt: string; closesAt: string; prizeGroups: RafflePrizeGroup[] };
export type RaffleReceipt = { id: string; campaignId: string; tickets: number; createdAt: string };
export type RaffleBoardData = {
  source: "live";
  member: { displayName: string; avatarUrl: string | null };
  servers: { id: string; name: string }[];
  selectedGuildId: string | null;
  balance: number;
  campaigns: { id: string; title: string; description: string; status: "OPEN" | "CLOSED" | "DRAWN"; opensAt: string; closesAt: string; claimDeadline: string; ticketLimit: number; ownEntries: number; totalEntries: number; winnerCount: number; prizes: Omit<RafflePrizeGroup, "reference">[]; revision: string }[];
  entries: (RaffleReceipt & { campaignTitle: string })[];
  wins: { id: string; campaignId: string; campaignTitle: string; prizeLabel: string; status: string; claimDeadline: string; deliveredAt: string | null }[];
};
export type RaffleCampaignInput = { guildId: string; eventId: string; title: string; ticketLimit: number; claimDeadline: string; webSettings: RaffleWebSettings };
export type RaffleAdminCampaign = RaffleCampaignInput & { id: string; status: string; ticketCount: number; revision: string; drawStatus: string | null; winnerCount: number; awardedCount: number };
export type RaffleAdminData = {
  servers: { id: string; name: string }[]; selectedGuildId: string | null;
  campaigns: RaffleAdminCampaign[];
  events: { id: string; title: string; endsAt: string }[];
  rewardOptions: { kind: RafflePrizeKind; reference: string; label: string }[];
};
export class RaffleError extends Error {
  constructor(readonly code: string, message: string, readonly status = 400) { super(message); }
}
export function raffleObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RaffleError("RAFFLE_INVALID", "รูปแบบข้อมูลไม่ถูกต้อง");
  return value as Record<string, unknown>;
}
export function raffleText(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new RaffleError("RAFFLE_INVALID", `${label}ไม่ถูกต้อง`);
  return value.trim();
}
export function raffleId(value: unknown) {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/.test(value)) throw new RaffleError("RAFFLE_INVALID", "รหัสรายการไม่ถูกต้อง");
  return value;
}
export function raffleGuild(value: unknown) {
  if (typeof value !== "string" || !/^[1-9]\d{16,19}$/.test(value) || BigInt(value) > BigInt("18446744073709551615")) throw new RaffleError("RAFFLE_INVALID", "รหัสเซิร์ฟเวอร์ไม่ถูกต้อง");
  return value;
}
export function raffleInteger(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new RaffleError("RAFFLE_INVALID", `${label}ต้องเป็นจำนวนเต็ม ${min}–${max}`);
  return value;
}
export function raffleDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT/.test(value) || !Number.isFinite(Date.parse(value))) throw new RaffleError("RAFFLE_INVALID", "วันเวลาไม่ถูกต้อง");
  return new Date(value).toISOString();
}
export function parseRaffleWebSettings(value: unknown): RaffleWebSettings {
  const row = raffleObject(value);
  if (row.version !== 1 || !Array.isArray(row.prizeGroups) || !row.prizeGroups.length || row.prizeGroups.length > 20) throw new RaffleError("RAFFLE_INVALID", "รายการรางวัลไม่ถูกต้อง");
  const prizeGroups = row.prizeGroups.map(raw => {
    const p = raffleObject(raw);
    if (!["ROLE", "ITEM", "BADGE"].includes(String(p.kind))) throw new RaffleError("RAFFLE_INVALID", "ประเภทรางวัลไม่ถูกต้อง");
    const kind = p.kind as RafflePrizeKind;
    const reference = kind === "ROLE" ? raffleGuild(p.reference) : raffleId(p.reference);
    return { kind, reference, label: raffleText(p.label, "ชื่อรางวัล", 120), quantity: raffleInteger(p.quantity, "จำนวนของต่อคน", 1, kind === "ROLE" ? 1 : 99), winnerCount: raffleInteger(p.winnerCount, "จำนวนผู้โชคดี", 1, 20) };
  });
  if (prizeGroups.reduce((sum, p) => sum + p.winnerCount, 0) > 20) throw new RaffleError("RAFFLE_INVALID", "ผู้โชคดีรวมต่อรอบต้องไม่เกิน 20 คน");
  const opensAt = raffleDate(row.opensAt), closesAt = raffleDate(row.closesAt);
  if (opensAt >= closesAt) throw new RaffleError("RAFFLE_INVALID", "เวลาปิดรับต้องอยู่หลังเวลาเปิดรับ");
  return { version: 1, description: raffleText(row.description, "รายละเอียด", 3000, false), opensAt, closesAt, prizeGroups };
}
export function parseRaffleCampaignInput(value: unknown): RaffleCampaignInput {
  const row = raffleObject(value), webSettings = parseRaffleWebSettings(row.webSettings);
  const claimDeadline = raffleDate(row.claimDeadline);
  if (claimDeadline <= webSettings.closesAt) throw new RaffleError("RAFFLE_INVALID", "วันหมดเขตรับรางวัลต้องอยู่หลังปิดรับตั๋ว");
  return { guildId: raffleGuild(row.guildId), eventId: raffleId(row.eventId), title: raffleText(row.title, "ชื่อกิจกรรมชิงโชค", 160), ticketLimit: raffleInteger(row.ticketLimit, "ตั๋วสูงสุดต่อคน", 1, 20), claimDeadline, webSettings };
}
export function expandRafflePrizes(settings: RaffleWebSettings) {
  return settings.prizeGroups.flatMap(({ winnerCount, ...prize }) => Array.from({ length: winnerCount }, () => ({ ...prize })));
}
export function assertRaffleItemQuantities(groups: RafflePrizeGroup[], items: { id: string; isStackable: boolean; maxStack: number | null }[]) {
  if (groups.some(prize => {
    const item = items.find(i => i.id === prize.reference);
    const capacity = item ? item.isStackable ? item.maxStack ?? 99 : 1 : 0;
    return !Number.isSafeInteger(capacity) || capacity < prize.quantity;
  })) throw new RaffleError("RAFFLE_REWARD_QUANTITY_INVALID", "จำนวนของต่อคนเกินความจุของไอเทม กรุณาลดจำนวนหรือแก้คลังไอเทมก่อน", 400);
}
export function parseRaffleEntry(value: unknown) {
  const row = raffleObject(value);
  const requestId = raffleText(row.requestId, "รหัสยืนยัน", 36);
  if (!/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(requestId)) throw new RaffleError("RAFFLE_INVALID", "รหัสยืนยันไม่ถูกต้อง");
  return { guildId: raffleGuild(row.guildId), quantity: raffleInteger(row.quantity, "จำนวนตั๋ว", 1, 20), requestId: requestId.toLowerCase(), revision: raffleDate(row.revision) };
}
