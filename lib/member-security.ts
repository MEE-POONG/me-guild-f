import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const PASSWORD_MIN_LENGTH = 12;
export const MAX_CHALLENGE_ATTEMPTS = 5;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= PASSWORD_MIN_LENGTH && value.length <= 128;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string | null) {
  const parts = encoded?.split(":");
  const valid = parts?.length === 3 && parts[0] === "scrypt" && /^[a-f0-9]{32}$/.test(parts[1]) && /^[a-f0-9]{128}$/.test(parts[2]);
  const salt = valid ? parts[1] : "00000000000000000000000000000000";
  const expected = Buffer.from(valid ? parts[2] : "00".repeat(64), "hex");
  const actual = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(expected, actual) && Boolean(valid);
}

export function privateDigest(value: string) {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET_NOT_CONFIGURED");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function challengeDigest(email: string, purpose: string, code: string) {
  return privateDigest(`member-challenge:${purpose}:${email}:${code}`);
}

export function safeReturnPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/member";
  try {
    const url = new URL(value, "https://me-guild.invalid");
    return url.origin === "https://me-guild.invalid" ? `${url.pathname}${url.search}${url.hash}` : "/member";
  } catch { return "/member"; }
}

export function providerEmailVerified(provider: string, profile: unknown) {
  if (!profile || typeof profile !== "object") return false;
  const value = profile as Record<string, unknown>;
  return provider === "google" ? value.email_verified === true : provider === "discord" && value.verified === true;
}

export function mutationError(request: Request) {
  const origin = request.headers.get("origin");
  let expected: string;
  try { expected = new URL(process.env.NEXTAUTH_URL ?? request.url).origin; } catch { return "INVALID_ORIGIN"; }
  if (!origin || origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") return "INVALID_ORIGIN";
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") return "JSON_REQUIRED";
  if (Number(request.headers.get("content-length") ?? 0) > 64_000) return "BODY_TOO_LARGE";
  return null;
}

export async function readJsonBody(request: Request) {
  if (!request.body) throw new Error("INVALID_BODY");
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let raw = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64_000) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } finally { reader.releaseLock(); }
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_BODY");
  return value as Record<string, unknown>;
}
