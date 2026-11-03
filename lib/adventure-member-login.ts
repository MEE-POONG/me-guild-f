/** Browser transport for the existing isolated member auth route. No Office auth client/provider. */
import { ADVENTURE_MEMBER_AUTH_BASE_PATH, adventureMemberProviderRedirect, adventureMemberRedirect, type AdventureMemberProvider } from "./adventure-member-policy";

type LoginDependencies = { origin: string; fetch: typeof fetch; signal?: AbortSignal };
async function memberCsrf(dependencies: LoginDependencies): Promise<string> {
  // Native browser fetch must not receive the dependency object as its `this` value.
  const request = dependencies.fetch;
  const csrf = await request(`${ADVENTURE_MEMBER_AUTH_BASE_PATH}/csrf`, { credentials: "same-origin", cache: "no-store", redirect: "error", signal: dependencies.signal });
  if (!csrf.ok) throw new Error("MEMBER_LOGIN_UNAVAILABLE");
  const body: unknown = await csrf.json();
  if (!body || typeof body !== "object" || !("csrfToken" in body) || typeof body.csrfToken !== "string" || !/^[a-f\d]{64}$/.test(body.csrfToken)) throw new Error("MEMBER_LOGIN_UNAVAILABLE");
  return body.csrfToken;
}

export async function startAdventureMemberLogin(provider: AdventureMemberProvider, returnTo: string, dependencies: LoginDependencies, options: { link?: boolean } = {}): Promise<string> {
  if (provider !== "discord" && provider !== "google") throw new Error("MEMBER_LOGIN_UNAVAILABLE");
  const csrfToken = await memberCsrf(dependencies);
  const request = dependencies.fetch;
  const body = new URLSearchParams({ csrfToken, callbackUrl: adventureMemberRedirect(returnTo, dependencies.origin), json: "true" });
  if (options.link === true) body.set("intent", "link");
  const response = await request(`${ADVENTURE_MEMBER_AUTH_BASE_PATH}/signin/${provider}`, {
    method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: dependencies.signal,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("MEMBER_LOGIN_UNAVAILABLE");
  const redirect: unknown = await response.json();
  if (!redirect || typeof redirect !== "object" || !("url" in redirect) || typeof redirect.url !== "string") throw new Error("MEMBER_LOGIN_UNAVAILABLE");
  const target = new URL(redirect.url, dependencies.origin);
  const sameSite = target.origin === dependencies.origin && adventureMemberRedirect(target.toString(), dependencies.origin) === target.toString();
  if (!sameSite && !adventureMemberProviderRedirect(target, provider, dependencies.origin)) throw new Error("MEMBER_LOGIN_UNAVAILABLE");
  return target.toString();
}

export function startAdventureDiscordLogin(returnTo: string, dependencies: LoginDependencies): Promise<string> {
  return startAdventureMemberLogin("discord", returnTo, dependencies);
}

/** Log out only the isolated member session, returning to one fixed local page. */
export async function endAdventureMemberSession(dependencies: LoginDependencies): Promise<string> {
  const csrfToken = await memberCsrf(dependencies);
  const callbackUrl = `${dependencies.origin}/adventure/login`;
  const request = dependencies.fetch;
  const response = await request(`${ADVENTURE_MEMBER_AUTH_BASE_PATH}/signout`, {
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
