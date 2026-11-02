import { RaffleStage } from "@/container/activity/raffle-stage";
export const metadata = { title: "ทดลองเครื่องหมุนลูกบอล — Me Guild", robots: { index: false, follow: false } };
export default function StageDemoPage() {
  return <RaffleStage campaignId="000000000000000000000001" mode="control" demo />;
}
