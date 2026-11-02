import assert from "node:assert/strict";
import test from "node:test";
import { endAdventureMemberSession, startAdventureDiscordLogin } from "../lib/adventure-member-login";
import { ADVENTURE_DISCORD_SCOPE } from "../lib/adventure-member-policy";

const origin = "https://community.example.test";
const base = "/api/adventure/member-auth";
const csrfToken = "a".repeat(64);

function discordUrl() {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.search = new URLSearchParams({ client_id: "123456789012345678", redirect_uri: `${origin}${base}/callback/discord`, scope: ADVENTURE_DISCORD_SCOPE, state: "fixture-state", code_challenge: "fixture-challenge", code_challenge_method: "S256" }).toString();
  return url;
}

function fixture(result: unknown = { url: discordUrl().toString() }, csrf: unknown = { csrfToken }) {
  const calls: { url: string; options: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    calls.push({ url, options: init ?? {} });
    return Response.json(url.endsWith("/csrf") ? csrf : result);
  };
  return { calls, fetcher };
}

test("both auth entry pages use the isolated CSRF-protected Discord transport and retain member deep links", async () => {
  const f = fixture();
  const controller = new AbortController();
  const destination = "/adventure/marketplace?guildId=123456789012345678&view=auctions&compose=auction";
  assert.equal(await startAdventureDiscordLogin(destination, { origin, fetch: f.fetcher, signal: controller.signal }), discordUrl().toString());
  assert.equal(f.calls[0].url, `${base}/csrf`);
  assert.equal(f.calls[1].url, `${base}/signin/discord`);
  assert.equal(f.calls[1].options.method, "POST");
  const body = new URLSearchParams(f.calls[1].options.body as URLSearchParams);
  assert.equal(body.get("csrfToken"), csrfToken);
  assert.equal(body.get("callbackUrl"), `${origin}${destination}`);
  for (const { options } of f.calls) {
    assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store");
    assert.equal(options.redirect, "error");
    assert.equal(options.signal, controller.signal);
  }
});

test("a foreign requested destination is replaced before it reaches OAuth", async () => {
  const f = fixture();
  await startAdventureDiscordLogin("https://evil.test/adventure", { origin, fetch: f.fetcher });
  assert.equal(new URLSearchParams(f.calls[1].options.body as URLSearchParams).get("callbackUrl"), `${origin}/adventure`);
});

test("malformed CSRF payloads stop before submitting a sign-in request", async () => {
  for (const csrf of [null, {}, { csrfToken: "wrong" }, { csrfToken: [csrfToken] }]) {
    const f = fixture(undefined, csrf);
    await assert.rejects(startAdventureDiscordLogin("/adventure", { origin, fetch: f.fetcher }), /MEMBER_LOGIN_UNAVAILABLE/);
    assert.equal(f.calls.length, 1);
  }
});

test("Discord redirects require the exact callback, scope, state and S256 challenge", async () => {
  const mutations: ((url: URL) => void)[] = [
    url => { url.hostname = "discord.com.evil.test"; },
    url => { url.searchParams.set("redirect_uri", "https://evil.test/callback"); },
    url => { url.searchParams.set("scope", "identify"); },
    url => { url.searchParams.delete("state"); },
    url => { url.searchParams.delete("code_challenge"); },
    url => { url.searchParams.set("code_challenge_method", "plain"); },
    url => { url.username = "user"; },
  ];
  for (const mutate of mutations) {
    const target = discordUrl(); mutate(target);
    const f = fixture({ url: target.toString() });
    await assert.rejects(startAdventureDiscordLogin("/adventure", { origin, fetch: f.fetcher }), /MEMBER_LOGIN_UNAVAILABLE/);
  }
});

test("safe member error redirects survive while Office and malformed auth responses fail closed", async () => {
  const safe = `${origin}/adventure/login?error=MemberUnavailable`;
  assert.equal(await startAdventureDiscordLogin("/adventure", { origin, fetch: fixture({ url: safe }).fetcher }), safe);
  for (const result of [null, {}, { url: 123 }, { url: `${origin}/api/auth/signin` }, { url: "https://evil.test/" }]) {
    await assert.rejects(startAdventureDiscordLogin("/adventure", { origin, fetch: fixture(result).fetcher }), /MEMBER_LOGIN_UNAVAILABLE/);
  }
});

test("logout sends a CSRF-protected member request and accepts only the legacy fixed login destination", async () => {
  const target = `${origin}/adventure/login`;
  const f = fixture({ url: target });
  assert.equal(await endAdventureMemberSession({ origin, fetch: f.fetcher }), target);
  assert.equal(f.calls[1].url, `${base}/signout`);
  assert.equal(f.calls[1].options.method, "POST");
  const body = new URLSearchParams(f.calls[1].options.body as URLSearchParams);
  assert.equal(body.get("csrfToken"), csrfToken);
  assert.equal(body.get("callbackUrl"), target);
  for (const url of ["https://evil.test/", `${origin}/login`, `${target}?returnTo=https://evil.test/`]) {
    await assert.rejects(endAdventureMemberSession({ origin, fetch: fixture({ url }).fetcher }), /MEMBER_LOGOUT_UNAVAILABLE/);
  }
});

test("unavailable and aborted auth requests do not synthesize a navigation target", async () => {
  const unavailable: typeof fetch = async () => new Response(null, { status: 503 });
  await assert.rejects(startAdventureDiscordLogin("/adventure", { origin, fetch: unavailable }), /MEMBER_LOGIN_UNAVAILABLE/);
  const controller = new AbortController(); controller.abort();
  const aborted: typeof fetch = async (_input, init) => { init?.signal?.throwIfAborted(); throw new Error("unexpected fetch"); };
  await assert.rejects(startAdventureDiscordLogin("/adventure", { origin, fetch: aborted, signal: controller.signal }), { name: "AbortError" });
});
