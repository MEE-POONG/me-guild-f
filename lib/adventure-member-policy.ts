/** Public browser policy only. Identity, OAuth credentials and session verification stay in B. */
export const ADVENTURE_MEMBER_AUTH_BASE_PATH = "/api/adventure/member-auth";
export const ADVENTURE_DISCORD_SCOPE = "identify email guilds guilds.members.read";
export const ADVENTURE_GOOGLE_SCOPE = "openid email profile";
export type AdventureMemberProvider = "discord" | "google";
export const ADVENTURE_MEMBER_RETURN_PATHS = ["/adventure", "/adventure/login", "/adventure/raffles", "/adventure/skills", "/adventure/marketplace"] as const;

/** Navigation is limited to the selected provider's fixed authorization request. */
export function adventureMemberProviderRedirect(target: URL, provider: AdventureMemberProvider, origin: string): boolean {
  if (target.username || target.password || target.hash) return false;
  const google = provider === "google";
  const endpoint = google
    ? target.origin === "https://accounts.google.com" && target.pathname === "/o/oauth2/v2/auth"
    : provider === "discord" && target.origin === "https://discord.com" && ["/oauth2/authorize", "/api/oauth2/authorize"].includes(target.pathname);
  const params = target.searchParams;
  const keys = ["client_id", "redirect_uri", "scope", "state", "code_challenge", "code_challenge_method", ...(google ? ["response_type", "nonce"] : [])];
  return endpoint && keys.every(key => params.getAll(key).length === 1 && Boolean(params.get(key)))
    && params.get("redirect_uri") === `${origin}${ADVENTURE_MEMBER_AUTH_BASE_PATH}/callback/${provider}`
    && params.get("scope") === (google ? ADVENTURE_GOOGLE_SCOPE : ADVENTURE_DISCORD_SCOPE)
    && params.get("code_challenge_method") === "S256"
    && (!google || params.get("response_type") === "code");
}

export function adventureMemberRedirect(url: string, origin: string): string {
  try {
    const target = new URL(url, origin);
    if (target.origin === origin && (ADVENTURE_MEMBER_RETURN_PATHS as readonly string[]).includes(target.pathname) && !target.username && !target.password) return target.toString();
  } catch { /* Use the safe member landing page. */ }
  return `${origin}/adventure`;
}
