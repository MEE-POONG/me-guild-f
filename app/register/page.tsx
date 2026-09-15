import { MemberAuthPage } from "@/components/member-auth-page";
export const metadata = { title: "สมัครสมาชิก" };
export default function RegisterPage() { return <MemberAuthPage mode="register" title="สมัครสมาชิก" description="กรอกชื่อและอีเมล แล้วตั้งรหัสผ่านพร้อมยืนยันรหัสจากกล่องจดหมาย หรือสมัครผ่าน Google และ Discord" />; }
