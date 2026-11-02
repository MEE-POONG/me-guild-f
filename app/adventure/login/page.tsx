import type { Metadata } from "next";
import { AdventureMemberLogin } from "@/container/adventure/member-login";
import { getMemberLoginStatus } from "@/lib/backend";
import { memberAuthPageInput, type MemberAuthSearchParams } from "@/lib/member-auth-page";

export const metadata: Metadata = { title: "เข้าสู่กิลด์ด้วย Discord | Me Guild", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdventureLoginPage({ searchParams }: { searchParams: Promise<MemberAuthSearchParams> }) {
  const [query, status] = await Promise.all([searchParams, getMemberLoginStatus()]);
  const input = memberAuthPageInput(query, "/adventure/raffles");
  return <AdventureMemberLogin mode="login" configured={status.configured} returnTo={input.returnTo} initialError={input.error ?? status.error} currentDisplayName={status.currentDisplayName} />;
}
