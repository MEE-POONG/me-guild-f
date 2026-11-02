export type MarketItem = { itemId: string; name: string; description: string | null; imageUrl: string | null; rarity: string | null; quantity: number };
export type MarketOffer = { itemId: string; quantity: number; name: string };
export type MarketTrade = {
  id: string; guildId: string; participantIds: string[]; offers: Record<string, MarketOffer[]>;
  copperOffers?: Record<string, number> | null; copperTransactionId?: string | null;
  lockedIds: string[]; confirmedIds: string[]; status: string; revision: number; expiresAt: string;
};
export type MarketAuction = {
  id: string; guildId: string; sellerId: string; itemId: string; itemName: string; imageUrl: string | null;
  quantity: number; status: string; currentPriceCopper: number; bidCount: number;
  highestBidderId: string | null; endsAt: string; revision: number; pending: boolean; businessWalletId?: string;
};
export type MarketSnapshot = {
  member: { discordId: string; displayName: string };
  guilds: { id: string; name: string }[]; selectedGuildId: string | null;
  inventory: MarketItem[]; trades: MarketTrade[]; auctions: MarketAuction[];
  ledger: { id: string; kind: string; amountCopper: number; auctionId: string | null; createdAt: string }[];
  wallet: { balanceCopper: number | null; configured: boolean; error?: string };
  rules: { bidFeeCopper: number; bidIncrementCopper: number };
};
export type MarketAction = { action: string; [key: string]: unknown };
export type MarketView = "inventory" | "trades" | "auctions";

export const MARKET_MAX_TRADE_COPPER = 1_000_000;
export function parseTradeCopper(value: string): number | null {
  const trimmed = value.trim();
  if (!/^(?:0|[1-9]\d{0,6})$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  return amount <= MARKET_MAX_TRADE_COPPER ? amount : null;
}
export function tradeCopper(trade: MarketTrade, memberId: string): number {
  return trade.copperOffers?.[memberId] ?? 0;
}
export function pendingTrade(trade: Pick<MarketTrade, "status">): boolean {
  return ["LOCKING", "SETTLING", "CANCELLING"].includes(trade.status);
}
export function tradeOfferSummary(trade: MarketTrade, memberId: string): string {
  return trade.participantIds.map((id) => {
    const items = (trade.offers[id] ?? []).map((item) => `${item.name} × ${item.quantity.toLocaleString("th-TH")}`).join(", ") || "ไม่มีไอเทม";
    return `${id === memberId ? "คุณส่ง" : `คู่แลก ${id} ส่ง`}: ${tradeCopper(trade, id).toLocaleString("th-TH")} Copper และ ${items}`;
  }).join(" • ");
}
export function tradeConfirmationCurrent(action: MarketAction, trades: MarketTrade[]): boolean {
  if (!action.action.startsWith("trade.") || action.expectedRevision === undefined) return true;
  return trades.some((trade) => trade.id === action.tradeId && trade.revision === action.expectedRevision);
}

export function marketplaceDestination(query: Record<string, string | string[] | undefined>) {
  const guildId = typeof query.guildId === "string" && /^\d{16,22}$/.test(query.guildId) ? query.guildId : "";
  const auctionId = typeof query.auction === "string" && /^[a-f\d]{24}$/.test(query.auction) ? query.auction : "";
  const composeAuction = query.compose === "auction";
  const view: MarketView = composeAuction || auctionId ? "auctions" : query.view === "trades" || query.view === "auctions" ? query.view : "inventory";
  return { guildId, auctionId, view, composeAuction };
}

export function auctionBidCost(auction: Pick<MarketAuction, "currentPriceCopper" | "highestBidderId">, memberId: string) {
  if (!Number.isSafeInteger(auction.currentPriceCopper) || auction.currentPriceCopper < 0) throw new RangeError("Invalid Copper amount");
  const price = BigInt(auction.currentPriceCopper) + BigInt(1);
  const priceToHold = auction.highestBidderId === memberId ? BigInt(1) : price;
  const project = (value: bigint) => {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("Copper amount exceeds display precision");
    return Number(value);
  };
  return { price: project(price), priceToHold: project(priceToHold), charge: project(priceToHold + BigInt(1)) };
}

export const marketStatus: Record<string, string> = {
  OPEN: "เปิดอยู่", DRAFT: "จัดของ", LOCKED: "ล็อกของแล้ว", COMPLETED: "สำเร็จ", SETTLED: "ปิดประมูลแล้ว",
  CANCELLED: "ยกเลิกแล้ว", EXPIRED: "หมดเวลา", PENDING: "กำลังตรวจสอบธุรกรรม", SETTLING: "กำลังชำระและส่งมอบ",
  LOCKING: "กำลังกัน Copper", CANCELLING: "กำลังคืนไอเทมและ Copper",
  AWAITING_AUTHORIZATION: "รอผู้ลงนามอนุมัติรอบ",
};
export const marketLedgerLabel: Record<string, string> = {
  BID_FEE: "ค่ายกไม้", BID_ESCROW: "พักเงินราคาประมูล", BID_REFUND: "คืนราคาที่ถูกแซง",
  PRICE_ESCROW: "พักเงินราคาประมูล", OUTBID_REFUND: "คืนราคาที่ถูกแซง", BUSINESS_BID_FEES: "ค่ายกไม้เข้ากระเป๋าธุรกิจเซิร์ฟเวอร์",
  WINNER_FEE_REFUND: "คืนค่ายกไม้ผู้ชนะ", SELLER_PAYOUT: "รายรับผู้ขาย", TREASURY_FEE: "ค่ายกไม้เข้าคลังกลาง",
  AUCTION_BID: "ยกไม้ประมูล", AUCTION_REFUND: "คืนเงินประมูล", AUCTION_PAYOUT: "รับเงินปิดประมูล",
};

export function marketplaceLoginUrl(guildId: string, auctionId: string, options: { view?: MarketView; composeAuction?: boolean } = {}): string {
  const query = new URLSearchParams();
  if (/^\d{16,22}$/.test(guildId)) query.set("guildId", guildId);
  if (/^[a-f\d]{24}$/.test(auctionId)) query.set("auction", auctionId);
  if (options.composeAuction) {
    query.set("view", "auctions");
    query.set("compose", "auction");
  } else if (options.view === "trades" || options.view === "auctions") query.set("view", options.view);
  return `/adventure/login?returnTo=${encodeURIComponent(`/adventure/marketplace${query.size ? `?${query}` : ""}`)}`;
}

export function offersEqual(left: { itemId: string; quantity: number }[], right: { itemId: string; quantity: number }[]) {
  const normalized = (items: { itemId: string; quantity: number }[]) => items.filter((item) => item.quantity > 0).map((item) => `${item.itemId}:${item.quantity}`).sort().join("|");
  return normalized(left) === normalized(right);
}

export function businessAuthorizationUrl(auction: MarketAuction, origin = process.env.NEXT_PUBLIC_ME_COIN_PORTAL_ORIGIN || "https://me-coins.me-prompt-technology.com") {
  if (!auction.businessWalletId || !/^[a-f\d]{24}$/.test(auction.businessWalletId)) return null;
  try {
    const url = new URL(origin);
    const local = process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash || (url.protocol !== "https:" && !local)) return null;
    url.pathname = `/wallet/business/${auction.businessWalletId}`;
    for (const [key, value] of Object.entries({ roundId: auction.id, sellerDiscordId: auction.sellerId, startingPriceCopper: String(auction.currentPriceCopper), expiresAt: auction.endsAt })) url.searchParams.set(key, value);
    url.hash = "business-auctions";
    return url.toString();
  } catch { return null; }
}
