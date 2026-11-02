import "server-only";
import { cookies } from "next/headers";
import { getBackendOrigin, getOfficeOrigin, memberCookieHeader } from "./backend-config";

export function getOfficeUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\x00-\x1f]/.test(path)) throw new Error("INVALID_OFFICE_PATH");
  return new URL(path, getOfficeOrigin()).toString();
}
export async function getMemberLoginStatus(): Promise<{ configured: boolean; currentDisplayName: string | null; error: string | null }> {
  try {
    const values = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
    const response = await fetch(`${getBackendOrigin()}/api/adventure/member-auth/status`, { headers: { Cookie: memberCookieHeader(values) }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error();
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("configured" in data) || typeof data.configured !== "boolean" || !("currentDisplayName" in data) || data.currentDisplayName !== null && (typeof data.currentDisplayName !== "string" || data.currentDisplayName.length > 120)) throw new Error();
    return { configured: data.configured, currentDisplayName: data.currentDisplayName as string | null, error: null };
  } catch { return { configured: false, currentDisplayName: null, error: "ยังเชื่อมต่อประตูสมาชิกไม่สำเร็จ กรุณาลองใหม่ภายหลัง" }; }
}
