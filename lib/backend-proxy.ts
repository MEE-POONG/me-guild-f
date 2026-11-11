import { getBackendOrigin, getFrontendOrigin, isMemberSetCookie, memberCookieHeader, type BackendEnvironment } from "./backend-config";
import { adventureMemberProviderRedirect } from "./adventure-member-policy";

export function allowedAdventureMethod(path: readonly string[], method: string): boolean {
  const read = method === "GET" || method === "HEAD";
  if (path.length === 1 && ["marketplace", "registration", "member-credentials"].includes(path[0])) return read || method === "POST";
  if (path.length === 1 && ["rewards", "progression", "skills", "achievements", "guild-room", "raffles"].includes(path[0])) return read;
  if (path.length === 2 && path[0] === "skills" && path[1] === "library") return read;
  if (path.length === 2 && path[0] === "projects" && /^[a-z0-9][a-z0-9-]{1,79}$/.test(path[1])) return read;
  if (path.length === 2 && path[0] === "achievements" && path[1] === "sync") return method === "POST";
  if (path.length === 3 && path[0] === "raffles" && /^[a-f\d]{24}$/.test(path[1]) && path[2] === "entries") return method === "POST";
  if (path[0] !== "member-auth") return false;
  if (path.length === 2 && ["status", "csrf", "session", "error"].includes(path[1])) return read;
  if (path.length === 2 && path[1] === "signout") return method === "POST";
  if (path.length === 3 && ["discord", "google"].includes(path[2])) return path[1] === "signin" && method === "POST" || path[1] === "callback" && read;
  return false;
}

const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" };
function unavailable(status = 503, code = "GUILD_BACKEND_UNAVAILABLE"): Response {
  return Response.json({ error: "ยังเชื่อมต่อ Me Guild ไม่สำเร็จ กรุณาลองใหม่ภายหลัง", code }, { status, headers: privateHeaders });
}
async function limitedBody(request: Request): Promise<ArrayBuffer | undefined> {
  if (!request.body) return undefined;
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > 65_536) { await reader.cancel(); throw new Error("BODY_TOO_LARGE"); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const result = new ArrayBuffer(length), bytes = new Uint8Array(result);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return result;
}

/** A narrow browser transport. All authentication and business authorization remain in B. */
export async function proxyAdventureRequest(request: Request, path: readonly string[], options: { env?: BackendEnvironment; fetch?: typeof fetch } = {}): Promise<Response> {
  if (!allowedAdventureMethod(path, request.method)) return unavailable(404, "GUILD_ROUTE_NOT_FOUND");
  try {
    const env = options.env ?? process.env, backend = getBackendOrigin(env), frontend = getFrontendOrigin(env);
    if (request.method === "POST" && (request.headers.get("Origin") !== frontend || request.headers.get("Sec-Fetch-Site") === "cross-site")) return unavailable(403, "GUILD_ORIGIN_REJECTED");
    const url = new URL(backend);
    url.pathname = `/api/adventure/${path.map(encodeURIComponent).join("/")}`;
    url.search = new URL(request.url).search;
    const headers = new Headers({ Accept: request.headers.get("Accept") ?? "application/json" });
    const cookies = memberCookieHeader(request.headers.get("Cookie"));
    if (cookies) headers.set("Cookie", cookies);
    for (const key of ["Content-Type", "Origin", "Sec-Fetch-Site"]) { const value = request.headers.get(key); if (value) headers.set(key, value); }
    const body = request.method === "POST" ? await limitedBody(request) : undefined;
    const response = await (options.fetch ?? fetch)(url, { method: request.method, headers, body, cache: "no-store", redirect: "manual", signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]) });
    const output = new Headers(privateHeaders);
    const type = response.headers.get("Content-Type"); if (type) output.set("Content-Type", type);
    const location = response.headers.get("Location");
    if (location) {
      const target = new URL(location, frontend);
      const local = target.origin === frontend && (target.pathname === "/adventure" || target.pathname.startsWith("/adventure/"));
      const provider = path[0] === "member-auth" && (path[2] === "discord" || path[2] === "google")
        && adventureMemberProviderRedirect(target, path[2], frontend);
      if (target.username || target.password || (!local && !provider)) { await response.body?.cancel(); return unavailable(502, "GUILD_REDIRECT_REJECTED"); }
      output.set("Location", target.toString());
    }
    for (const cookie of response.headers.getSetCookie()) { if (isMemberSetCookie(cookie)) output.append("Set-Cookie", cookie); }
    return new Response(response.body, { status: response.status, headers: output });
  } catch (error) { return error instanceof Error && error.message === "BODY_TOO_LARGE" ? unavailable(413, "GUILD_BODY_TOO_LARGE") : unavailable(); }
}
