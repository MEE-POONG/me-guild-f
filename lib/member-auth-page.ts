import { adventureMemberRedirect } from "./adventure-member-policy";

export type MemberAuthMode = "login" | "register";
export type MemberAuthSearchParams = Record<string, string | string[] | undefined>;
export const PUBLIC_MEMBER_RETURN_TO = "/adventure?progression=member";

/** Only a relative, allowlisted member destination reaches the UI or OAuth helper. */
export function memberAuthPageInput(query: MemberAuthSearchParams, fallback = PUBLIC_MEMBER_RETURN_TO) {
  const requested = typeof query.returnTo === "string" ? query.returnTo : fallback;
  const allowed = new URL(adventureMemberRedirect(requested, "https://member.invalid"));
  const code = typeof query.error === "string" ? query.error : "";
  const error = code === "MemberLinkRequired"
    ? "อีเมลนี้มีบัญชีสมาชิกอยู่แล้ว ให้เข้าสู่ระบบด้วยบัญชีเดิมก่อน แล้วเลือกเชื่อมบัญชี Google หรือ Discord"
    : code === "MemberLinkConflict"
      ? "บัญชีนี้เชื่อมกับสมาชิกอีกคนแล้ว กรุณาเลือกบัญชีที่ต้องการเชื่อมให้ถูกต้อง"
      : code === "MemberLinkExpired"
        ? "คำขอเชื่อมบัญชีหมดอายุหรือบัญชีที่เข้าสู่ระบบเปลี่ยนไป กรุณาเริ่มเชื่อมบัญชีอีกครั้ง"
    : code === "MemberUnavailable"
      ? "ประตูสมาชิกยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง"
      : code ? "เข้าสู่ระบบไม่สำเร็จหรือยกเลิกไปแล้ว กดปุ่มเพื่อลองอีกครั้ง" : null;
  return { returnTo: `${allowed.pathname}${allowed.search}${allowed.hash}`, error };
}

export function memberAuthSwitchHref(mode: MemberAuthMode, returnTo: string): string {
  const destination = memberAuthPageInput({ returnTo }).returnTo;
  return `/${mode}?${new URLSearchParams({ returnTo: destination })}`;
}
