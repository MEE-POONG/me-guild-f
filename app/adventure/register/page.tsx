import { AdventurerRegistrationForm } from "@/container/adventure/adventurer-registration";
import { memberAuthPageInput, type MemberAuthSearchParams } from "@/lib/member-auth-page";

export const metadata = {
  title: "ทะเบียนผู้มาเยือนและนักผจญภัย | Me Guild",
  description: "บันทึกข้อมูลผู้มาเยือนและลงทะเบียนนักผจญภัยเพื่อเริ่มเลเวล 1",
  robots: { index: false, follow: false },
};

export default async function RegistrationPage({ searchParams }: { searchParams: Promise<MemberAuthSearchParams> }) {
  const input = memberAuthPageInput(await searchParams);
  const returnTo = input.returnTo.split(/[?#]/)[0] === "/adventure/register" ? "/adventure?progression=member" : input.returnTo;
  return <AdventurerRegistrationForm returnTo={returnTo} />;
}
