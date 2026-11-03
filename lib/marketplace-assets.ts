import { MARKET_MAX_TRADE_COPPER, parseTradeCopper } from "./marketplace-types";

export type MarketAsset = { key: string; name: string; quantity: number; imageUrl?: string | null; ticket?: boolean };
export const MARKET_ASSET_PAGE_SIZE = 12;

export function tradeAssetLimit(asset: MarketAsset): number {
  return Number.isSafeInteger(asset.quantity) ? Math.max(0, Math.min(asset.quantity, MARKET_MAX_TRADE_COPPER)) : 0;
}

/** A refresh may remove an unsaved selection from inventory; keep it removable. */
export function reconcileTradeAssets(available: MarketAsset[], quantities: Record<string, string>, remembered: Record<string, MarketAsset>): MarketAsset[] {
  const known = new Set(available.map(asset => asset.key));
  const missing = Object.keys(quantities).filter(key => quantities[key] !== "0" && !known.has(key)).map(key => ({
    ...(remembered[key] ?? { key, name: key.startsWith("ticket:") ? "ตั๋ว" : "ไอเทมที่ไม่มีในกระเป๋า", ticket: key.startsWith("ticket:") }),
    quantity: 0,
  }));
  return [...available, ...missing];
}

export function invalidTradeQuantities(quantities: Record<string, string>, available: MarketAsset[]): boolean {
  const limits = new Map(available.map(asset => [asset.key, tradeAssetLimit(asset)]));
  return Object.entries(quantities).some(([key, raw]) => {
    const quantity = parseTradeCopper(raw);
    return quantity === null || quantity > (limits.get(key) ?? 0);
  });
}

export function marketAssetPage(assets: MarketAsset[], query: string, page: number) {
  const search = query.trim().toLocaleLowerCase("th-TH");
  const filtered = assets.filter(asset => asset.name.toLocaleLowerCase("th-TH").includes(search));
  const pages = Math.max(1, Math.ceil(filtered.length / MARKET_ASSET_PAGE_SIZE));
  const current = Math.max(0, Math.min(Number.isFinite(page) ? Math.floor(page) : 0, pages - 1));
  return { filtered, pages, current, shown: filtered.slice(current * MARKET_ASSET_PAGE_SIZE, (current + 1) * MARKET_ASSET_PAGE_SIZE) };
}
