import type { Metadata } from "next";
import { Marketplace } from "@/container/adventure/marketplace";
import { marketplaceDestination } from "@/lib/marketplace-types";

export const metadata: Metadata = {
  title: { absolute: "กระเป๋าและตลาด · Me Guild" },
  description: "กระเป๋าไอเทม แลกเปลี่ยนกับเพื่อน และประมูลในตลาด Me Guild",
  robots: { index: false, follow: false },
};

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { guildId, auctionId, view, composeAuction } = marketplaceDestination(await searchParams);
  return <Marketplace key={`${guildId}:${auctionId}:${view}:${composeAuction}`} initialGuildId={guildId} initialAuctionId={auctionId} initialView={view} initialComposeAuction={composeAuction} />;
}
