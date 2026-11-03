import "server-only";
import { cookies } from "next/headers";
import { getBackendOrigin, getOfficeOrigin, memberCookieHeader } from "./backend-config";
import { parseMemberLoginStatus, unavailableMemberLoginStatus, type MemberLoginStatus } from "./member-login-status";

export function getOfficeUrl(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\x00-\x1f]/.test(path)) throw new Error("INVALID_OFFICE_PATH");
  return new URL(path, getOfficeOrigin()).toString();
}
export async function getMemberLoginStatus(): Promise<MemberLoginStatus> {
  try {
    const values = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
    const response = await fetch(`${getBackendOrigin()}/api/adventure/member-auth/status`, { headers: { Cookie: memberCookieHeader(values) }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error();
    const data: unknown = await response.json();
    return parseMemberLoginStatus(data);
  } catch { return unavailableMemberLoginStatus(); }
}
