import type { Metadata } from "next";
import { AdventureMemberLogin } from "@/container/adventure/member-login";
import { getMemberLoginStatus } from "@/lib/backend";
import { memberAuthPageInput, type MemberAuthSearchParams } from "@/lib/member-auth-page";

export const metadata: Metadata = {
  title: "สมัครสมาชิก | Me Guild",
  description: "สมัคร Me Guild เป็นผู้มาเยือนด้วย Discord หรือ Google แล้วลงทะเบียนนักผจญภัยหลังเข้าสู่ระบบเพื่อเริ่มเลเวล 1",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<MemberAuthSearchParams> }) {
  const [query, status] = await Promise.all([searchParams, getMemberLoginStatus()]);
  const input = memberAuthPageInput(query);
  return <AdventureMemberLogin mode="register" {...status} returnTo={input.returnTo} initialError={input.error ?? status.error} />;
}
