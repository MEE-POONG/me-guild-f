import { parseRegistrationSummary, type RegistrationSummary } from "./adventurer-registration";

export type MemberAuthProvider = "discord" | "google";
export type MemberLoginStatus = {
  configured: boolean;
  currentDisplayName: string | null;
  providers: Record<MemberAuthProvider | "credentials", boolean>;
  currentProvider: MemberAuthProvider | "credentials" | null;
  linkedProviders: Record<MemberAuthProvider, boolean>;
  discordReady: boolean;
  error: string | null;
  registration?: RegistrationSummary | null;
};

export function unavailableMemberLoginStatus(): MemberLoginStatus {
  return { configured: false, currentDisplayName: null, providers: { discord: false, google: false, credentials: false }, currentProvider: null, linkedProviders: { discord: false, google: false }, discordReady: false, error: "ยังเชื่อมต่อระบบสมาชิกไม่สำเร็จ กรุณาลองใหม่ภายหลัง" };
}

/** Provider availability is public; no provider credential or session token belongs in this DTO. */
export function parseMemberLoginStatus(input: unknown): MemberLoginStatus {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_MEMBER_STATUS");
  const data = input as Record<string, unknown>;
  if (typeof data.configured !== "boolean" || data.currentDisplayName !== null && (typeof data.currentDisplayName !== "string" || data.currentDisplayName.length > 120)) throw new Error("INVALID_MEMBER_STATUS");
  function flags(value: unknown, fallback: Record<MemberAuthProvider, boolean>): Record<MemberAuthProvider, boolean> {
    if (value === undefined) return fallback;
    if (!value || typeof value !== "object" || !("discord" in value) || !("google" in value) || typeof value.discord !== "boolean" || typeof value.google !== "boolean") throw new Error("INVALID_MEMBER_STATUS");
    return { discord: value.discord, google: value.google };
  }
  const signedIn = data.configured && data.currentDisplayName !== null;
  const providers = flags(data.providers, { discord: data.configured, google: false });
  const credentials = data.providers && typeof data.providers === "object" && "credentials" in data.providers ? data.providers.credentials : false;
  if (typeof credentials !== "boolean") throw new Error("INVALID_MEMBER_STATUS");
  const linkedProviders = flags(data.linkedProviders, { discord: signedIn, google: false });
  const currentProvider = data.currentProvider === undefined ? signedIn ? "discord" : null : data.currentProvider;
  if (currentProvider !== null && currentProvider !== "discord" && currentProvider !== "google" && currentProvider !== "credentials" || data.discordReady !== undefined && typeof data.discordReady !== "boolean") throw new Error("INVALID_MEMBER_STATUS");
  return {
    configured: data.configured,
    currentDisplayName: signedIn ? data.currentDisplayName as string : null,
    providers: data.configured ? { ...providers, credentials } : { discord: false, google: false, credentials: false },
    currentProvider: signedIn ? currentProvider : null,
    linkedProviders: signedIn ? linkedProviders : { discord: false, google: false },
    discordReady: signedIn && linkedProviders.discord && (data.discordReady === undefined ? currentProvider === "discord" : data.discordReady),
    error: null,
    ...(data.registration === undefined ? {} : { registration: signedIn && data.registration !== null ? parseRegistrationSummary(data.registration) : null }),
  };
}
