import { MemberAuthPage } from "@/components/member-auth-page";
export const metadata = { title: "ลืมรหัสผ่าน" };
export default function ForgotPasswordPage() { return <MemberAuthPage mode="forgot-password" title="ลืมรหัสผ่าน" description="เราจะส่งรหัสสำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของบัญชี ใช้ได้กับบัญชีที่สมัครผ่าน Google และ Discord เช่นกัน" />; }
