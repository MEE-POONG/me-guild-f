/** Browser transport for the existing isolated member auth route. No Office auth client/provider. */
import { ADVENTURE_MEMBER_AUTH_BASE_PATH, ADVENTURE_DISCORD_SCOPE, adventureMemberRedirect } from "./adventure-member-policy";

type LoginDependencies = { origin: string; fetch: typeof fetch; signal?: AbortSignal };
async function memberCsrf(dependencies: LoginDependencies): Promise<string> {
  const csrf = await dependencies.fetch(`${ADVENTURE_MEMBER_AUTH_BASE_PATH}/csrf`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: dependencies.signal });
  if (!csrf.ok) throw new Error("MEMBER_LOGIN_UNAVAILABLE");
  const body: unknown = await csrf.json();
  if (!body || typeof body !== "object" || !("csrfToken" in body) || typeof body.csrfToken !== "string" || !/^[a-f\d]{64}$/.test(body.csrfToken)) throw new Error("MEMBER_LOGIN_UNAVAILABLE");
  return body.csrfToken;
}

export async function startAdventureDiscordLogin(returnTo: string, dependencies: LoginDependencies): Promise<string> {
  const csrfToken = await memberCsrf(dependencies);
  const response = await dependencies.fetch(`${ADVENTURE_MEMBER_AUTH_BASE_PATH}/signin/discord`, {
    method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: dependencies.signal,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl: adventureMemberRedirect(returnTo, dependencies.origin), json: "true" }),
  });
  if (!response.ok) throw new Error("MEMBER_LOGIN_UNAVAILABLE");
  const redirect: unknown = await response.json();
  if (!redirect || typeof redirect !== "object" || !("url" in redirect) || typeof redirect.url !== "string") throw new Error("MEMBER_LOGIN_UNAVAILABLE");
  const target = new URL(redirect.url, dependencies.origin);
  const sameSite = target.origin === dependencies.origin && adventureMemberRedirect(target.toString(), dependencies.origin) === target.toString();
  const discord = target.origin === "https://discord.com" && !target.username && !target.password && ["/oauth2/authorize", "/api/oauth2/authorize"].includes(target.pathname)
    && target.searchParams.get("redirect_uri") === `${dependencies.origin}${ADVENTURE_MEMBER_AUTH_BASE_PATH}/callback/discord`
    && target.searchParams.get("scope") === ADVENTURE_DISCORD_SCOPE && target.searchParams.get("code_challenge_method") === "S256"
    && Boolean(target.searchParams.get("state")) && Boolean(target.searchParams.get("code_challenge"));
  if (!sameSite && !discord) throw new Error("MEMBER_LOGIN_UNAVAILABLE");
  return target.toString();
}

/** Log out only the isolated member session, returning to one fixed local page. */
export async function endAdventureMemberSession(dependencies: LoginDependencies): Promise<string> {
  const csrfToken = await memberCsrf(dependencies);
  const callbackUrl = `${dependencies.origin}/adventure/login`;
  const response = await dependencies.fetch(`${ADVENTURE_MEMBER_AUTH_BASE_PATH}/signout`, {
    method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: dependencies.signal,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl, json: "true" }),
  });
  if (!response.ok) throw new Error("MEMBER_LOGOUT_UNAVAILABLE");
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("url" in result) || typeof result.url !== "string") throw new Error("MEMBER_LOGOUT_UNAVAILABLE");
  const target = new URL(result.url, dependencies.origin);
  if (target.toString() !== callbackUrl) throw new Error("MEMBER_LOGOUT_UNAVAILABLE");
  return target.toString();
}
