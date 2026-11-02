import type { Metadata } from "next";
import { AdventureHub } from "@/container/adventure/adventure-hub";

export const metadata: Metadata = {
  title: { absolute: "Me Guild — โลกของเหล่านักผจญภัย" },
  description: "ชุมชนต่างโลกของคนเล่นเกมและผู้ใฝ่รู้ เปิดกระเป๋า เช็คสเตตัส อ่านกระทู้เกม ดูรางวัลตั๋วนำโชค และพบเพื่อนร่วมกิลด์ใน Me Guild",
  robots: { index: false, follow: false },
};

export default async function AdventurePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const requested = query.community;
  const authError = typeof query.error === "string"
    ? query.error === "MemberLinkRequired"
      ? "อีเมลนี้มีบัญชีสมาชิกอยู่แล้ว กรุณาเชื่อม Discord กับบัญชีเดิมก่อน"
      : query.error === "MemberUnavailable"
        ? "ระบบเข้าสู่ระบบสมาชิกยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง"
        : "เข้าสู่ระบบสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
    : null;
  const initialCommunityView = requested === "guild" || requested === "rewards" || requested === "knowledge" || requested === "games" || requested === "achievements"
    ? requested
    : authError ? "guild" : "games";
  return <AdventureHub initialCommunityView={initialCommunityView} memberAuthError={authError} initialPanel={query.panel === "status" ? "status" : undefined} initialProgressionMode={query.progression === "member" ? "member" : "demo"} />;
}
