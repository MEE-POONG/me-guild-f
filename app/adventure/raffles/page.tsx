import { RaffleBoard } from "@/container/adventure/raffle-board";
export const metadata = { title: "ตั๋วนำโชค — Me Guild", robots: { index: false, follow: false } };
export default function RafflesPage() {
  return <main style={{ background: "#f6f2e7", minHeight: "100vh", color: "#244337", padding: "clamp(16px, 4vw, 48px)", fontFamily: "var(--font-thai), sans-serif" }}>
    <RaffleBoard />
  </main>;
}
