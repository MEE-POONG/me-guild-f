import { RaffleError, raffleDate, raffleInteger, raffleObject } from "./adventure-raffle-policy";
export type StagePrize = { slot: number; label: string; kind: "ROLE" | "ITEM" | "BADGE"; quantity: number; state: "CLOSED" | "REVEALED" | "UNFILLED" };
export type StageWinner = { slot: number; displayName: string; entryLabel: string; prizeLabel: string; kind: StagePrize["kind"]; quantity: number };
export type RaffleStageData = {
  campaignId: string; title: string; phase: "DRAFT" | "OPEN" | "LOCKED" | "DRAWING" | "READY" | "COMPLETE" | "INVALIDATED";
  revision: string; prepared: boolean; revealedCount: number; totalWinners: number; plannedWinnerCount: number;
  entryCount: number; participantCount: number;
  prizes: StagePrize[]; nextPrize: Omit<StagePrize, "state"> | null; revealedWinners: StageWinner[];
  entries: { code: string; displayName: string; ticketCount: number }[];
  entryPagination: { page: number; pageSize: number; totalParticipants: number; hasMore: boolean };
};
export type RaffleStagePresentation = { version: 1; drawId: string; snapshotHash: string; sourceFingerprint: string; revealedCount: number };
export function parseStageMutation(raw: unknown) {
  const value = raffleObject(raw);
  if (value.action !== "prepare" && value.action !== "next") throw new RaffleError("STAGE_INVALID", "คำสั่งเวทีไม่ถูกต้อง");
  return { action: value.action, revision: raffleDate(value.revision), expectedRevealedCount: raffleInteger(value.expectedRevealedCount, "ลำดับการเปิดผล", 0, 20) };
}
export function stagePage(value: string | null) {
  if (value === null) return 1;
  if (!/^[1-9]\d{0,2}$/.test(value) || Number(value) > 100) throw new RaffleError("STAGE_INVALID", "หน้ารายการไม่ถูกต้อง");
  return Number(value);
}
