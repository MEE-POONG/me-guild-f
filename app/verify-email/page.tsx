import { MemberAuthPage } from "@/components/member-auth-page";
export const metadata = { title: "ยืนยันอีเมล" };
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) { const { email } = await searchParams; return <MemberAuthPage mode="verify-email" title="ยืนยันอีเมล" description="กรอกรหัส 8 หลักจากอีเมล และตั้งรหัสผ่านของคุณเพื่อเปิดใช้งานบัญชีอย่างปลอดภัย" email={email} />; }
