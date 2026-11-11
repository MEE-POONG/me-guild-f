import { MemberAccount } from "@/container/adventure/member-account";
import { memberAuthPageInput, type MemberAuthSearchParams } from "@/lib/member-auth-page";

export const metadata = {
  title: "ชื่อผู้ใช้และรหัสผ่าน | Me Guild",
  description: "ยืนยันเจ้าของบัญชีเพื่อตั้งชื่อผู้ใช้และรหัสผ่านของสมาชิก Me Guild",
  robots: { index: false, follow: false },
};

export default async function MemberAccountPage({ searchParams }: { searchParams: Promise<MemberAuthSearchParams> }) {
  const input = memberAuthPageInput(await searchParams);
  const returnTo = input.returnTo.split(/[?#]/)[0] === "/adventure/account" ? "/adventure" : input.returnTo;
  return <MemberAccount returnTo={returnTo} />;
}
