import { adventureMemberRedirect } from "./adventure-member-policy";
import { memberAuthPageInput } from "./member-auth-page";

const endpoint = "/api/adventure/member-credentials";
type Dependencies = { fetch: typeof fetch; origin: string; signal?: AbortSignal };
export type MemberCredentialStatus = { authenticated: boolean; username: string | null; passwordConfigured: boolean; emailHint: string | null };
export type MemberCredentialChallenge = { challengeId: string; expiresAt: string; reference: string; emailHint: string | null };
export type MemberCredentialCommand =
  | { action: "request-code"; identifier?: string }
  | { action: "verify-and-set"; challengeId: string; code: string; username: string; password: string; returnTo: string }
  | { action: "login"; identifier: string; password: string; returnTo: string };

const messages: Record<string, string> = {
  MEMBER_CREDENTIALS_INVALID: "ชื่อผู้ใช้ อีเมล หรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง หรือรับรหัสยืนยันเพื่อเข้าใช้บัญชีเดิม",
  MEMBER_CODE_INVALID: "รหัสยืนยันไม่ถูกต้อง หมดอายุ หรือใช้ไปแล้ว กรุณาตรวจรหัสล่าสุดหรือขอรหัสใหม่",
  MEMBER_USERNAME_UNAVAILABLE: "ชื่อผู้ใช้นี้ใช้ไม่ได้ กรุณาเลือกชื่ออื่น",
  MEMBER_CREDENTIALS_INPUT_INVALID: "กรุณาตรวจชื่อผู้ใช้ อีเมล หรือรหัสผ่านตามเงื่อนไขที่ระบุ และหลีกเลี่ยงรหัสผ่านที่เดาง่าย",
  MEMBER_SIGN_IN_REQUIRED: "กรุณาเข้าสู่ระบบอีกครั้งเพื่อจัดการบัญชี",
  MEMBER_AUTH_RATE_LIMIT: "มีคำขอหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่",
  MEMBER_EMAIL_UNAVAILABLE: "ยังส่งรหัสยืนยันไม่ได้ กรุณาลองใหม่ภายหลัง หรือเข้าสู่ระบบด้วยบัญชีที่เชื่อมไว้",
  MEMBER_SERVICE_UNAVAILABLE: "ระบบบัญชียังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง",
};
export function memberCredentialError(error: unknown): string {
  return error instanceof Error && Object.hasOwn(messages, error.message) ? messages[error.message] : "ยังตรวจสอบบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("MEMBER_SERVICE_UNAVAILABLE");
  return value as Record<string, unknown>;
}
function nullableText(value: unknown, max: number): value is string | null {
  return value === null || typeof value === "string" && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
}
export function parseMemberCredentialStatus(input: unknown): MemberCredentialStatus {
  const data = object(input);
  if (typeof data.authenticated !== "boolean" || typeof data.passwordConfigured !== "boolean" || !nullableText(data.username, 32) || !nullableText(data.emailHint, 254)) throw new Error("MEMBER_SERVICE_UNAVAILABLE");
  return data.authenticated
    ? { authenticated: true, username: data.username, passwordConfigured: data.passwordConfigured, emailHint: data.emailHint }
    : { authenticated: false, username: null, passwordConfigured: false, emailHint: null };
}
export function parseMemberCredentialChallenge(input: unknown): MemberCredentialChallenge {
  const data = object(input);
  if (typeof data.challengeId !== "string" || !/^[A-Za-z0-9_-]{16,256}$/.test(data.challengeId)
    || typeof data.expiresAt !== "string" || !Number.isFinite(Date.parse(data.expiresAt))
    || typeof data.reference !== "string" || data.reference.length < 1 || data.reference.length > 64 || /[\u0000-\u001f\u007f]/.test(data.reference)
    || !nullableText(data.emailHint, 254)) throw new Error("MEMBER_SERVICE_UNAVAILABLE");
  return { challengeId: data.challengeId, expiresAt: data.expiresAt, reference: data.reference, emailHint: data.emailHint };
}
export function memberAccountHref(returnTo: string): string {
  return `/adventure/account?${new URLSearchParams({ returnTo: memberAuthPageInput({ returnTo }).returnTo })}`;
}
export function credentialInputError(username: string, password: string): string | null {
  if (!/^[a-z0-9][a-z0-9_.-]{1,30}[a-z0-9]$/i.test(username.trim())) return "ชื่อผู้ใช้ต้องมี 3–32 ตัว ใช้ a–z, 0–9, จุด, ขีดกลาง หรือขีดล่าง และขึ้นต้นกับลงท้ายด้วยตัวอักษรหรือตัวเลข";
  if (Array.from(password).length < 15 || new TextEncoder().encode(password).length > 72) return "รหัสผ่านต้องมีอย่างน้อย 15 ตัวอักษรและไม่เกิน 72 ไบต์ อักษรไทยหรืออีโมจิอาจใช้หลายไบต์";
  return null;
}

async function request(dependencies: Dependencies, command?: MemberCredentialCommand): Promise<unknown> {
  const send = dependencies.fetch;
  const response = await send(endpoint, {
    method: command ? "POST" : "GET", credentials: "same-origin", cache: "no-store", redirect: "error", signal: dependencies.signal,
    ...(command ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) } : {}),
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const code = data && typeof data === "object" && "code" in data && typeof data.code === "string" ? data.code : "MEMBER_SERVICE_UNAVAILABLE";
    throw new Error(Object.hasOwn(messages, code) ? code : "MEMBER_SERVICE_UNAVAILABLE");
  }
  return data;
}
export async function getMemberCredentialStatus(dependencies: Dependencies): Promise<MemberCredentialStatus> {
  return parseMemberCredentialStatus(await request(dependencies));
}
export async function requestMemberCredentialCode(identifier: string | undefined, dependencies: Dependencies): Promise<MemberCredentialChallenge> {
  return parseMemberCredentialChallenge(await request(dependencies, { action: "request-code", ...(identifier === undefined ? {} : { identifier: identifier.trim() }) }));
}
export async function submitMemberCredentials(command: Exclude<MemberCredentialCommand, { action: "request-code" }>, dependencies: Dependencies): Promise<string> {
  const data = object(await request(dependencies, { ...command, returnTo: memberAuthPageInput({ returnTo: command.returnTo }).returnTo }));
  if (data.ok !== true || typeof data.url !== "string") throw new Error("MEMBER_SERVICE_UNAVAILABLE");
  const target = new URL(data.url, dependencies.origin);
  if (target.origin !== dependencies.origin || adventureMemberRedirect(target.toString(), dependencies.origin) !== target.toString()) throw new Error("MEMBER_SERVICE_UNAVAILABLE");
  return target.toString();
}
