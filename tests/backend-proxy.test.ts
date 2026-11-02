import assert from "node:assert/strict";
import test from "node:test";
import {
  getBackendOrigin,
  getFrontendOrigin,
  getOfficeOrigin,
  isMemberSetCookie,
  memberCookieHeader,
  type BackendEnvironment,
} from "../lib/backend-config";
import { allowedAdventureMethod, proxyAdventureRequest } from "../lib/backend-proxy";
import { adventureMemberRedirect } from "../lib/adventure-member-policy";

const frontend = "https://community.example.test";
const backend = "https://backend.example.test";
const campaignId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const env: BackendEnvironment = { NODE_ENV: "production", ME_GUILD_BACKEND_URL: backend, ME_GUILD_FRONTEND_URL: frontend, ME_GUILD_OFFICE_URL: "https://office.example.test" };
type Call = { url: string; options: RequestInit };

function fixture(handler: (call: Call) => Response | Promise<Response> = () => Response.json({ source: "upstream-fixture" })) {
  const calls: Call[] = [];
  const fetcher: typeof fetch = async (input, options) => {
    const call = { url: input instanceof Request ? input.url : String(input), options: options ?? {} };
    calls.push(call);
    return handler(call);
  };
  return { calls, fetcher };
}
function request(path = "/api/adventure/raffles", init: RequestInit = {}) {
  return new Request(`${frontend}${path}`, init);
}
function mutation(body = "{}", extraHeaders: Record<string, string> = {}) {
  return request("/api/adventure/achievements/sync", { method: "POST", body, headers: { Origin: frontend, "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", ...extraHeaders } });
}
function privateResponse(response: Response, status: number) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Cookie");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
}

test("origin configuration accepts only explicit root origins and safe frontend/Office protocols", () => {
  assert.equal(getBackendOrigin(env), backend);
  assert.equal(getFrontendOrigin(env), frontend);
  assert.equal(getOfficeOrigin(env), "https://office.example.test");
  assert.equal(getBackendOrigin({ NODE_ENV: "development" }), "http://localhost:3002");
  assert.equal(getFrontendOrigin({ NODE_ENV: "development" }), "http://localhost:3000");
  assert.equal(getOfficeOrigin({ NODE_ENV: "development" }), "http://localhost:3002");
  assert.equal(getBackendOrigin({ ...env, ME_GUILD_BACKEND_URL: "http://api.internal:3002" }), "http://api.internal:3002");
  for (const value of ["", "not-a-url", "javascript:alert(1)", "ftp://example.test", "https://user:password@example.test", "https://example.test/api", "https://example.test/?query=1", "https://example.test/#fragment"]) {
    assert.throws(() => getBackendOrigin({ ...env, ME_GUILD_BACKEND_URL: value }), /ME_GUILD_CONNECTION_NOT_CONFIGURED/);
    assert.throws(() => getFrontendOrigin({ ...env, ME_GUILD_FRONTEND_URL: value }), /ME_GUILD_CONNECTION_NOT_CONFIGURED/);
    assert.throws(() => getOfficeOrigin({ ...env, ME_GUILD_OFFICE_URL: value }), /ME_GUILD_CONNECTION_NOT_CONFIGURED/);
  }
  for (const parse of [getBackendOrigin, getFrontendOrigin, getOfficeOrigin]) assert.throws(() => parse({ NODE_ENV: "production" }), /ME_GUILD_CONNECTION_NOT_CONFIGURED/);
  for (const parse of [getFrontendOrigin, getOfficeOrigin]) {
    assert.throws(() => parse({ NODE_ENV: "production", ME_GUILD_FRONTEND_URL: "http://localhost:3000", ME_GUILD_OFFICE_URL: "http://localhost:3002" }));
    assert.throws(() => parse({ NODE_ENV: "development", ME_GUILD_FRONTEND_URL: "http://public.example.test", ME_GUILD_OFFICE_URL: "http://public.example.test" }));
  }
});

test("only the public member/project method and path combinations are allowlisted", () => {
  const reads = [["rewards"], ["progression"], ["skills"], ["achievements"], ["guild-room"], ["raffles"], ["projects", "me-guild-bangkok"], ["member-auth", "status"], ["member-auth", "csrf"], ["member-auth", "session"], ["member-auth", "error"], ["member-auth", "callback", "discord"]];
  for (const path of reads) {
    assert.equal(allowedAdventureMethod(path, "GET"), true, path.join("/"));
    assert.equal(allowedAdventureMethod(path, "HEAD"), true, path.join("/"));
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) assert.equal(allowedAdventureMethod(path, method), false);
  }
  for (const path of [["achievements", "sync"], ["raffles", campaignId, "entries"], ["member-auth", "signin", "discord"], ["member-auth", "signout"]]) {
    assert.equal(allowedAdventureMethod(path, "POST"), true);
    for (const method of ["GET", "HEAD", "PUT", "PATCH", "DELETE"]) assert.equal(allowedAdventureMethod(path, method), false);
  }
});

test("own-skill transport preserves upstream authentication and blocks member score mutations", async () => {
  const f = fixture(() => Response.json({ code: "MEMBER_SIGN_IN_REQUIRED" }, { status: 401 }));
  const response = await proxyAdventureRequest(request("/api/adventure/skills"), ["skills"], { env, fetch: f.fetcher });
  privateResponse(response, 401);
  assert.equal(f.calls[0].url, `${backend}/api/adventure/skills`);
  assert.equal((await response.json()).code, "MEMBER_SIGN_IN_REQUIRED");
  const mutationFetcher = fixture();
  const mutationResponse = await proxyAdventureRequest(request("/api/adventure/skills", { method: "POST", body: "{}", headers: { Origin: frontend } }), ["skills"], { env, fetch: mutationFetcher.fetcher });
  privateResponse(mutationResponse, 404);
  assert.equal(mutationFetcher.calls.length, 0);
  assert.equal(allowedAdventureMethod(["skills", "other-member"], "GET"), false);
});

test("starter skill library is narrowly readable and never permits writes or nested member paths", async () => {
  const f = fixture(() => Response.json({ kind: "STARTER_LIBRARY", professionCount: 28 }));
  const response = await proxyAdventureRequest(request("/api/adventure/skills/library"), ["skills", "library"], { env, fetch: f.fetcher });
  privateResponse(response, 200);
  assert.equal(f.calls[0].url, `${backend}/api/adventure/skills/library`);
  assert.equal((await response.json()).kind, "STARTER_LIBRARY");
  assert.equal(allowedAdventureMethod(["skills", "library"], "HEAD"), true);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) assert.equal(allowedAdventureMethod(["skills", "library"], method), false);
  for (const route of [["skills", "library", "member"], ["skills", "private"], ["skills", "library.json"]]) assert.equal(allowedAdventureMethod(route, "GET"), false);
});

test("Discord login may return to own-skill page while external and nested member paths remain rejected", () => {
  assert.equal(adventureMemberRedirect("/adventure/skills", frontend), `${frontend}/adventure/skills`);
  for (const target of ["https://attacker.test/adventure/skills", "/adventure/skills/another-member", "//attacker.test/adventure/skills", "/office"]) {
    assert.equal(adventureMemberRedirect(target, frontend), `${frontend}/adventure`);
  }
});

test("traversal, arbitrary upstream paths, Office auth/admin and malformed IDs are denied before fetch", async () => {
  const paths = [[], [".."], ["..", "raffles"], ["projects", ".."], ["projects", "%2e%2e"], ["projects", "a/b"], ["projects", "https://attacker.test"], ["projects", "project?other=1"], ["projects", "Valid-Project"], ["projects", "ab", "extra"], ["raffles", "invalid", "entries"], ["raffles", campaignId, "stage"], ["raffles", campaignId, "entries", "extra"], ["auth", "session"], ["office"], ["content", "projects"], ["member-auth", "signin", "google"], ["member-auth", "callback", "discord", "extra"], ["member-auth", "../auth"], ["member-auth", "providers"], ["/api/auth/signout"]];
  for (const path of paths) {
    const f = fixture();
    const response = await proxyAdventureRequest(request(), path, { env, fetch: f.fetcher });
    privateResponse(response, 404);
    assert.equal(f.calls.length, 0, path.join("/"));
    assert.equal((await response.json()).code, "GUILD_ROUTE_NOT_FOUND");
  }
});

test("POST requires the exact frontend Origin and rejects cross-site requests before fetch", async () => {
  const invalidHeaders: Record<string, string>[] = [{ "Sec-Fetch-Site": "same-origin" }, { Origin: "null" }, { Origin: "https://attacker.test" }, { Origin: backend }, { Origin: `${frontend}.attacker.test` }, { Origin: `${frontend}/` }, { Origin: `${frontend} https://attacker.test` }, { Origin: frontend, "Sec-Fetch-Site": "cross-site" }];
  for (const headers of invalidHeaders) {
    const f = fixture();
    const response = await proxyAdventureRequest(request("/api/adventure/achievements/sync", { method: "POST", body: "{}", headers }), ["achievements", "sync"], { env, fetch: f.fetcher });
    privateResponse(response, 403); assert.equal(f.calls.length, 0);
    assert.equal((await response.json()).code, "GUILD_ORIGIN_REJECTED");
  }
  const f = fixture();
  privateResponse(await proxyAdventureRequest(mutation(), ["achievements", "sync"], { env, fetch: f.fetcher }), 200);
  assert.equal(f.calls.length, 1);
});

test("member cookie filters preserve only the exact isolated names and numbered session chunks", () => {
  const good = ["me-guild-member.session-token=base", "me-guild-member.session-token.0=first", "me-guild-member.session-token.1=second", "me-guild-member.csrf-token=csrf", "me-guild-member.callback-url=callback", "me-guild-member.pkce.code_verifier=pkce", "me-guild-member.state=state", "me-guild-member.nonce=nonce"];
  const bad = ["me-guild-office.session-token=office", "next-auth.session-token=legacy", "__Secure-next-auth.session-token=legacy-secure", "other=private", "me-guild-member.session-token.evil=lookalike", "me-guild-member.session-tokenx=lookalike", "me-guild-member.session-token.-1=negative", "prefix-me-guild-member.csrf-token=wrong", "me-guild-member.unknown=wrong"];
  assert.equal(memberCookieHeader(null), "");
  assert.equal(memberCookieHeader([...bad, ...good].join("; ")), good.join("; "));
  for (const value of good) assert.equal(isMemberSetCookie(`${value}; Path=/; HttpOnly; SameSite=Lax`), true);
  for (const value of bad) assert.equal(isMemberSetCookie(`${value}; Path=/; HttpOnly`), false);
});

test("upstream sees member cookies but no Office credentials, Authorization, spoofed routing headers or server secrets", async () => {
  const f = fixture();
  const secretEnv = { ...env, DATABASE_URL: "mongodb://fixture-db-secret", NEXTAUTH_SECRET: "fixture-auth-secret", DISCORD_CLIENT_SECRET: "fixture-oauth-secret", DISCORD_BOT_TOKEN: "fixture-bot-secret" };
  const response = await proxyAdventureRequest(request("/api/adventure/raffles?guildId=123456789012345678", { headers: {
    Cookie: "me-guild-office.session-token=office-private; me-guild-member.session-token.0=member-first; next-auth.session-token=legacy-private; me-guild-member.session-token.1=member-second",
    Authorization: "Bearer attacker-or-office-token", Host: "attacker.invalid", "X-Forwarded-Host": "attacker.invalid", "X-Forwarded-Proto": "http", "X-Forwarded-For": "1.2.3.4", Forwarded: "host=attacker.invalid", "X-Real-IP": "1.2.3.4", Accept: "application/json",
  } }), ["raffles"], { env: secretEnv, fetch: f.fetcher });
  privateResponse(response, 200);
  const headers = new Headers(f.calls[0].options.headers);
  assert.equal(headers.get("Cookie"), "me-guild-member.session-token.0=member-first; me-guild-member.session-token.1=member-second");
  for (const key of ["Authorization", "Host", "X-Forwarded-Host", "X-Forwarded-Proto", "X-Forwarded-For", "Forwarded", "X-Real-IP"]) assert.equal(headers.has(key), false, key);
  const serialized = JSON.stringify({ url: f.calls[0].url, headers: Object.fromEntries(headers), body: await response.text() });
  for (const secret of ["office-private", "legacy-private", "attacker-or-office-token", "fixture-db-secret", "fixture-auth-secret", "fixture-oauth-secret", "fixture-bot-secret"]) assert.equal(serialized.includes(secret), false);
  assert.equal(f.calls[0].options.cache, "no-store"); assert.equal(f.calls[0].options.redirect, "manual");
  assert.ok(f.calls[0].options.signal instanceof AbortSignal);
});

test("query, request body, upstream status and content type pass through without expanding the target", async () => {
  const raw = '{"quantity":2,"requestId":"fixture-request","revision":"2026-10-28T00:00:00.000Z"}';
  const f = fixture(() => new Response('{"receipt":"fixture"}', { status: 201, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=99999", "Access-Control-Allow-Origin": "*", "X-Internal-Secret": "not-for-browser" } }));
  const input = request(`/api/adventure/raffles/${campaignId}/entries?tag=one&tag=two&return=%2Fadventure`, { method: "POST", headers: { Origin: frontend, "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json; charset=utf-8", Accept: "application/json" }, body: raw });
  const response = await proxyAdventureRequest(input, ["raffles", campaignId, "entries"], { env, fetch: f.fetcher });
  privateResponse(response, 201);
  assert.equal(f.calls[0].url, `${backend}/api/adventure/raffles/${campaignId}/entries?tag=one&tag=two&return=%2Fadventure`);
  assert.equal(f.calls[0].options.method, "POST");
  assert.equal(new TextDecoder().decode(f.calls[0].options.body as ArrayBuffer), raw);
  assert.equal(new Headers(f.calls[0].options.headers).get("Origin"), frontend);
  assert.equal(new Headers(f.calls[0].options.headers).get("Content-Type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8");
  assert.equal(response.headers.has("Access-Control-Allow-Origin"), false); assert.equal(response.headers.has("X-Internal-Secret"), false);
  assert.equal(await response.text(), '{"receipt":"fixture"}');
});

test("multiple member Set-Cookie headers survive separately while Office/legacy cookies are removed", async () => {
  const cookies = ["me-guild-member.session-token.0=first; Path=/; HttpOnly; Secure; SameSite=Lax", "me-guild-member.session-token.1=second; Path=/; HttpOnly; Secure; SameSite=Lax", "me-guild-member.csrf-token=csrf; Path=/; HttpOnly; Secure; SameSite=Lax", "me-guild-member.state=; Path=/; Max-Age=0; HttpOnly"];
  const f = fixture(() => {
    const headers = new Headers({ "Content-Type": "application/json" });
    for (const cookie of [...cookies, "me-guild-office.session-token=office; Path=/; HttpOnly", "next-auth.session-token=legacy; Path=/; HttpOnly", "me-guild-member.session-token.evil=bad; Path=/"]) headers.append("Set-Cookie", cookie);
    return new Response('{"ok":true}', { headers });
  });
  const response = await proxyAdventureRequest(request(), ["member-auth", "session"], { env, fetch: f.fetcher });
  assert.deepEqual(response.headers.getSetCookie(), cookies);
});

test("manual redirects allow local adventure pages and Discord authorization only on member-auth routes", async () => {
  for (const location of ["/adventure", "/adventure/login?error=MemberSignInFailed", `${frontend}/adventure/raffles#history`]) {
    const f = fixture(() => new Response(null, { status: 302, headers: { Location: location } }));
    const response = await proxyAdventureRequest(request(), ["member-auth", "session"], { env, fetch: f.fetcher });
    privateResponse(response, 302); assert.equal(response.headers.get("Location"), new URL(location, frontend).toString());
  }
  const discord = `https://discord.com/oauth2/authorize?client_id=123456789012345678&redirect_uri=${encodeURIComponent(`${frontend}/api/adventure/member-auth/callback/discord`)}&scope=identify+email+guilds+guilds.members.read&state=fixture-state&code_challenge=fixture-challenge&code_challenge_method=S256`;
  const f = fixture(() => new Response(null, { status: 302, headers: { Location: discord } }));
  const response = await proxyAdventureRequest(mutation(), ["member-auth", "signin", "discord"], { env, fetch: f.fetcher });
  privateResponse(response, 302); assert.equal(response.headers.get("Location"), discord);
  assert.equal(f.calls[0].options.redirect, "manual");
});

test("external, credential-bearing, Office and non-auth Discord redirects fail closed", async () => {
  for (const location of ["https://attacker.test/adventure", "//attacker.test/adventure", `${backend}/adventure`, `${frontend}/login`, `${frontend}/api/auth/signin`, `${frontend}/operations/raffles`, `${frontend}/adventure/../api/auth`, "javascript:alert(1)", "https://user:password@community.example.test/adventure", "https://discord.com/other", "https://discord.com.evil.test/oauth2/authorize"]) {
    const f = fixture(() => new Response(null, { status: 302, headers: { Location: location } }));
    const response = await proxyAdventureRequest(request(), ["member-auth", "session"], { env, fetch: f.fetcher });
    privateResponse(response, 502); assert.equal(response.headers.has("Location"), false);
    assert.equal((await response.json()).code, "GUILD_REDIRECT_REJECTED");
  }
  const f = fixture(() => new Response(null, { status: 302, headers: { Location: "https://discord.com/oauth2/authorize" } }));
  privateResponse(await proxyAdventureRequest(request(), ["raffles"], { env, fetch: f.fetcher }), 502);
});

test("backend auth/errors and HEAD/empty responses keep their real status with private headers", async () => {
  for (const status of [400, 401, 403, 404, 409, 429, 500, 503]) {
    const f = fixture(() => Response.json({ error: "upstream-fixture", code: `FIXTURE_${status}` }, { status }));
    const response = await proxyAdventureRequest(request(), ["raffles"], { env, fetch: f.fetcher });
    privateResponse(response, status); assert.equal((await response.json()).code, `FIXTURE_${status}`);
  }
  const f = fixture(() => new Response(null, { status: 204 }));
  const response = await proxyAdventureRequest(request("/api/adventure/projects/me-guild-bangkok", { method: "HEAD" }), ["projects", "me-guild-bangkok"], { env, fetch: f.fetcher });
  privateResponse(response, 204); assert.equal(await response.text(), ""); assert.equal(f.calls[0].options.method, "HEAD"); assert.equal(f.calls[0].options.body, undefined);
});

test("bad configuration and network/abort failures produce private 503 without leaking internals", async () => {
  for (const badEnv of [{ NODE_ENV: "production" }, { ...env, ME_GUILD_BACKEND_URL: "https://user:fixture-password@backend.example.test" }, { ...env, ME_GUILD_FRONTEND_URL: "http://community.example.test" }]) {
    const f = fixture();
    const response = await proxyAdventureRequest(request(), ["raffles"], { env: badEnv, fetch: f.fetcher });
    privateResponse(response, 503); assert.equal(f.calls.length, 0); assert.equal((await response.json()).code, "GUILD_BACKEND_UNAVAILABLE");
  }
  const f = fixture(() => { throw new Error("private DNS/address/database/oauth-token detail"); });
  const response = await proxyAdventureRequest(request(), ["raffles"], { env, fetch: f.fetcher });
  privateResponse(response, 503); assert.equal((await response.text()).includes("private DNS"), false);
  const controller = new AbortController(); controller.abort();
  const aborted = fixture(call => { assert.equal(call.options.signal?.aborted, true); throw new DOMException("fixture aborted", "AbortError"); });
  privateResponse(await proxyAdventureRequest(request("/api/adventure/raffles", { signal: controller.signal }), ["raffles"], { env, fetch: aborted.fetcher }), 503);
});

test("request byte limit rejects an oversized stream regardless of Content-Length and never fetches", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(32_769)); controller.enqueue(new Uint8Array(32_769)); }, cancel() { cancelled = true; } });
  const init: RequestInit & { duplex: "half" } = { method: "POST", duplex: "half", body: stream, headers: { Origin: frontend, "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json", "Content-Length": "1" } };
  const f = fixture();
  const response = await proxyAdventureRequest(request("/api/adventure/achievements/sync", init), ["achievements", "sync"], { env, fetch: f.fetcher });
  privateResponse(response, 413); assert.equal((await response.json()).code, "GUILD_BODY_TOO_LARGE"); assert.equal(f.calls.length, 0); assert.equal(cancelled, true);
  const exact = fixture(call => { assert.equal((call.options.body as ArrayBuffer).byteLength, 65_536); return Response.json({ accepted: true }); });
  privateResponse(await proxyAdventureRequest(mutation("x".repeat(65_536)), ["achievements", "sync"], { env, fetch: exact.fetcher }), 200);
});
