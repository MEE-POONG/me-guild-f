import type { Metadata } from "next";
import { AdventureMemberLogin } from "@/container/adventure/member-login";
import { getMemberLoginStatus } from "@/lib/backend";
import { memberAuthPageInput, type MemberAuthSearchParams } from "@/lib/member-auth-page";

export const metadata: Metadata = {
  title: "สมัครสมาชิก | Me Guild",
  description: "เริ่มการผจญภัยกับ Me Guild ใช้ Discord เพื่อสร้างบัญชีสมาชิกเมื่อยืนยันตัวตนสำเร็จครั้งแรก",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<MemberAuthSearchParams> }) {
  const [query, status] = await Promise.all([searchParams, getMemberLoginStatus()]);
  const input = memberAuthPageInput(query);
  return <AdventureMemberLogin mode="register" configured={status.configured} returnTo={input.returnTo} initialError={input.error ?? status.error} currentDisplayName={status.currentDisplayName} />;
}
