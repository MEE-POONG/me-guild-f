import type { Metadata } from "next";
import { AdventureMemberLogin } from "@/container/adventure/member-login";
import { getMemberLoginStatus } from "@/lib/backend";
import { memberAuthPageInput, type MemberAuthSearchParams } from "@/lib/member-auth-page";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | Me Guild",
  description: "กลับมาพบเพื่อนและไปต่อกับการผจญภัยของคุณ เข้าสู่ Me Guild ด้วยบัญชี Discord",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<MemberAuthSearchParams> }) {
  const [query, status] = await Promise.all([searchParams, getMemberLoginStatus()]);
  const input = memberAuthPageInput(query);
  return <AdventureMemberLogin mode="login" configured={status.configured} returnTo={input.returnTo} initialError={input.error ?? status.error} currentDisplayName={status.currentDisplayName} />;
}
