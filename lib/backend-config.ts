export type BackendEnvironment = {
  NODE_ENV?: string;
  ME_GUILD_BACKEND_URL?: string;
  ME_GUILD_FRONTEND_URL?: string;
  ME_GUILD_OFFICE_URL?: string;
};

function origin(value: string | undefined, local: string, env: BackendEnvironment, backend = false): string {
  const selected = value ?? (env.NODE_ENV !== "production" ? local : "");
  try {
    const url = new URL(selected);
    const localHttp = env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      !(url.protocol === "https:" || url.protocol === "http:" && (backend || localHttp))) throw new Error();
    return url.origin;
  } catch { throw new Error("ME_GUILD_CONNECTION_NOT_CONFIGURED"); }
}
export function getBackendOrigin(env: BackendEnvironment = process.env): string { return origin(env.ME_GUILD_BACKEND_URL, "http://localhost:3002", env, true); }
export function getFrontendOrigin(env: BackendEnvironment = process.env): string { return origin(env.ME_GUILD_FRONTEND_URL, "http://localhost:3000", env); }
export function getOfficeOrigin(env: BackendEnvironment = process.env): string { return origin(env.ME_GUILD_OFFICE_URL, "http://localhost:3002", env); }

const memberCookie = /^me-guild-member\.(?:session-token(?:\.\d+)?|csrf-token|callback-url|pkce\.code_verifier|state|nonce)=/;
export function memberCookieHeader(value: string | null): string {
  return (value ?? "").split(";").map((part) => part.trim()).filter((part) => memberCookie.test(part)).join("; ");
}
export function isMemberSetCookie(value: string): boolean { return memberCookie.test(value); }
