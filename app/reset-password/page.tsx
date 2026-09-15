import { MemberAuthPage } from "@/components/member-auth-page";
export const metadata = { title: "ตั้งรหัสผ่านใหม่" };
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) { const { email } = await searchParams; return <MemberAuthPage mode="reset-password" title="ตั้งรหัสผ่านใหม่" description="ใช้รหัสจากอีเมลเพื่อตั้งรหัสผ่านใหม่ หลังบันทึกทุกอุปกรณ์จะต้องเข้าสู่ระบบอีกครั้ง" email={email} />; }
