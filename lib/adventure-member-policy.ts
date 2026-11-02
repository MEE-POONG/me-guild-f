/** Public browser policy only. Identity, OAuth credentials and session verification stay in B. */
export const ADVENTURE_MEMBER_AUTH_BASE_PATH = "/api/adventure/member-auth";
export const ADVENTURE_DISCORD_SCOPE = "identify email guilds guilds.members.read";
export const ADVENTURE_MEMBER_RETURN_PATHS = ["/adventure", "/adventure/login", "/adventure/raffles", "/adventure/skills", "/adventure/marketplace"] as const;

export function adventureMemberRedirect(url: string, origin: string): string {
  try {
    const target = new URL(url, origin);
    if (target.origin === origin && (ADVENTURE_MEMBER_RETURN_PATHS as readonly string[]).includes(target.pathname) && !target.username && !target.password) return target.toString();
  } catch { /* Use the safe member landing page. */ }
  return `${origin}/adventure`;
}
